import type { User } from "@/types";

export const currentUser: User = {
  id: "usr-001",
  name: "João Martins",
  email: "joao.martins@example.test",
  avatarInitials: "JM",
  createdAt: "2025-11-04",
  purchases: 2,
  totalSpent: 115.4,
  status: "ativo",
};

export const customers: User[] = [
  currentUser,
  {
    id: "usr-002",
    name: "Rita Nunes",
    email: "rita.nunes@example.test",
    avatarInitials: "RN",
    createdAt: "2026-01-18",
    purchases: 1,
    totalSpent: 32,
    status: "ativo",
  },
  {
    id: "usr-003",
    name: "Miguel Sousa",
    email: "miguel.sousa@example.test",
    avatarInitials: "MS",
    createdAt: "2026-03-02",
    purchases: 3,
    totalSpent: 248.7,
    status: "ativo",
  },
  {
    id: "usr-004",
    name: "Ana Ferreira",
    email: "ana.ferreira@example.test",
    avatarInitials: "AF",
    createdAt: "2026-05-11",
    purchases: 1,
    totalSpent: 59,
    status: "inativo",
  },
  {
    id: "usr-005",
    name: "Bruno Lima",
    email: "bruno.lima@example.test",
    avatarInitials: "BL",
    createdAt: "2026-06-27",
    purchases: 2,
    totalSpent: 164.4,
    status: "ativo",
  },
];
