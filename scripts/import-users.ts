import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as XLSX from "xlsx";
import * as path from "path";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type Row = {
  Colaborador?: string | null;
  Email?: string | null;
  Gerente?: string | null;
  "Gerente 2"?: string | null;
};

const norm = (s: string | null | undefined) => (s ?? "").trim();
const lower = (s: string | null | undefined) => norm(s).toLowerCase();

async function main() {
  const excelPath =
    process.argv[2] ??
    "C:/Users/Fabiano de Amorim/Downloads/Base - sistema passagens.xlsx";

  console.log(`Reading ${path.basename(excelPath)}...`);
  const wb = XLSX.readFile(excelPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: null });

  const valid = rows.filter((r) => norm(r.Colaborador) && lower(r.Email));
  console.log(`${valid.length} rows with name + email.`);

  console.log("Pass 1/2: upserting users...");
  for (const r of valid) {
    const email = lower(r.Email);
    const name = norm(r.Colaborador);
    await prisma.user.upsert({
      where: { email },
      create: { email, name },
      update: { name },
    });
  }

  const nameToEmail = new Map<string, string>();
  for (const r of valid) {
    nameToEmail.set(norm(r.Colaborador), lower(r.Email));
  }

  console.log("Pass 2/2: linking managers...");
  const warnings: string[] = [];
  for (const r of valid) {
    const email = lower(r.Email);
    const mgr1Name = norm(r.Gerente);
    const mgr2Name = norm(r["Gerente 2"]);

    const resolveId = async (name: string, label: string) => {
      if (!name || name === "Comitê" || name === "Comite") return null;
      const mEmail = nameToEmail.get(name);
      if (!mEmail) {
        warnings.push(`  [WARN] ${label} "${name}" (de ${email}) não está na planilha.`);
        return null;
      }
      const u = await prisma.user.findUnique({
        where: { email: mEmail },
        select: { id: true },
      });
      return u?.id ?? null;
    };

    const managerId = await resolveId(mgr1Name, "Gerente");
    const manager2Id = await resolveId(mgr2Name, "Gerente 2");

    await prisma.user.update({
      where: { email },
      data: {
        manager: managerId ? { connect: { id: managerId } } : { disconnect: true },
        manager2: manager2Id ? { connect: { id: manager2Id } } : { disconnect: true },
      },
    });
  }

  if (warnings.length) {
    console.log("\nWarnings:");
    warnings.forEach((w) => console.log(w));
  }

  console.log("Promoting managers to GESTOR role...");
  const managerIds = new Set<string>();
  for (const r of valid) {
    for (const n of [norm(r.Gerente), norm(r["Gerente 2"])]) {
      if (!n || n === "Comitê" || n === "Comite") continue;
      const mEmail = nameToEmail.get(n);
      if (!mEmail) continue;
      const u = await prisma.user.findUnique({ where: { email: mEmail }, select: { id: true, role: true } });
      if (u && u.role === "COLABORADOR") managerIds.add(u.id);
    }
  }
  if (managerIds.size > 0) {
    await prisma.user.updateMany({
      where: { id: { in: Array.from(managerIds) } },
      data: { role: "GESTOR" },
    });
  }
  console.log(`Promoted ${managerIds.size} users to GESTOR.`);

  console.log(`\nImport finished. Users: ${valid.length}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
