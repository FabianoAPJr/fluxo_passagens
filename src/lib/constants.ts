import type { RequestStatus, Role } from "@prisma/client";

export const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING_MANAGER: "Aguardando gestor",
  REJECTED_BY_MANAGER: "Negada pelo gestor",
  PENDING_MANAGER_2: "Aguardando 2º gestor",
  REJECTED_BY_MANAGER_2: "Negada pelo 2º gestor",
  PENDING_QUOTATION: "Aguardando cotação",
  PENDING_TRAVELER: "Aguardando aprovação",
  APPROVED: "Aprovada",
  REJECTED_BY_TRAVELER: "Recusada pelo solicitante",
  CANCELLED: "Cancelada",
};

export const STATUS_COLORS: Record<RequestStatus, string> = {
  PENDING_MANAGER: "bg-yellow-100 text-yellow-800",
  REJECTED_BY_MANAGER: "bg-red-100 text-red-800",
  PENDING_MANAGER_2: "bg-amber-100 text-amber-800",
  REJECTED_BY_MANAGER_2: "bg-red-100 text-red-800",
  PENDING_QUOTATION: "bg-blue-100 text-blue-800",
  PENDING_TRAVELER: "bg-purple-100 text-purple-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED_BY_TRAVELER: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

export const ROLE_LABELS: Record<Role, string> = {
  MASTER: "Master",
  GESTOR: "Gestor",
  FINANCEIRO: "Financeiro",
  COLABORADOR: "Colaborador",
};

export const ROLE_COLORS: Record<Role, string> = {
  MASTER: "bg-purple-100 text-purple-800",
  GESTOR: "bg-blue-100 text-blue-800",
  FINANCEIRO: "bg-green-100 text-green-800",
  COLABORADOR: "bg-gray-100 text-gray-800",
};
