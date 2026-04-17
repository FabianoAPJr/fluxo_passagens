"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";

export default function ProfileForm({ currentPersonalEmail }: { currentPersonalEmail: string }) {
  const [personalEmail, setPersonalEmail] = useState(currentPersonalEmail);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalEmail }),
      });

      if (!res.ok) {
        toast.error("E-mail inválido ou erro ao salvar.");
        return;
      }

      toast.success("E-mail pessoal salvo com sucesso!");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="personalEmail">E-mail pessoal (opcional)</Label>
        <Input
          id="personalEmail"
          type="email"
          placeholder="seu@email.com"
          value={personalEmail}
          onChange={(e) => setPersonalEmail(e.target.value)}
        />
      </div>
      <Button
        onClick={handleSave}
        disabled={loading}
        className="bg-[#004d33] hover:bg-[#49624e]"
      >
        {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
        Salvar
      </Button>
    </div>
  );
}
