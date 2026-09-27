export type AccountStatus = "disponivel" | "reservada" | "vendida";

export type Server = "Brasil" | "Europa" | "América Latina";

export interface Account {
  id: string;
  title: string;
  price: number;
  level: number;
  server: Server;
  year: number;
  skins: number;
  evolutionWeapons: number;
  emotes: number;
  characters: number;
  passes: number;
  status: AccountStatus;
  featured: boolean;
  popularity: number;
  createdAt: string;
  description: string;
  highlights: string[];
  images: string[];
}

export type OrderStatus = "pendente" | "pago" | "cancelado" | "reembolsado";

export interface Order {
  id: string;
  reference: string;
  accountId: string;
  accountTitle: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  status: OrderStatus;
  paymentMethod: string;
  date: string;
  credentials: {
    login: string;
    password: string;
    recoveryEmail: string;
    notes: string;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarInitials: string;
  createdAt: string;
  purchases: number;
  totalSpent: number;
  status: "ativo" | "inativo";
}
