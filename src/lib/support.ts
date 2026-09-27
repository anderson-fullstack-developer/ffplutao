import { z } from "zod";

/** Suporte: assuntos, validação e tipos (partilhados entre cliente e servidor). */

export const SUPPORT_TOPICS = [
  "Problemas com uma compra",
  "Dúvidas sobre uma conta",
  "Pagamento",
  "Minha conta",
  "Outro assunto",
] as const;

export const TICKET_STATUSES = [
  { value: "OPEN", label: "Aberto" },
  { value: "IN_PROGRESS", label: "Em andamento" },
  { value: "CLOSED", label: "Fechado" },
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number]["value"];

const body = z
  .string()
  .trim()
  .min(10, "Escreva pelo menos 10 caracteres")
  .max(5000, "Máximo 5000 caracteres");

export const createTicketSchema = z.object({
  topic: z.enum(SUPPORT_TOPICS, { errorMap: () => ({ message: "Escolha um assunto" }) }),
  orderId: z.string().uuid().nullable(),
  message: body,
});

export const replySchema = z.object({
  ticketId: z.string().uuid(),
  message: z.string().trim().min(1, "Escreva uma mensagem").max(5000, "Máximo 5000 caracteres"),
});

export type CreateTicketInput = z.input<typeof createTicketSchema>;

export interface TicketSummary {
  id: string;
  reference: string;
  subject: string;
  status: TicketStatus;
  awaitingAdmin: boolean;
  lastMessageAt: string;
  createdAt: string;
  orderReference: string | null;
  customerName: string;
  customerEmail: string;
  messagesCount: number;
}

export interface TicketMessage {
  id: string;
  fromAdmin: boolean;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface TicketDetail extends TicketSummary {
  userId: string;
  order: {
    id: string;
    reference: string;
    status: string;
    amountCents: number;
    accountId: string;
    accountTitle: string;
    createdAt: string;
  } | null;
  messages: TicketMessage[];
}

export interface SupportOrderOption {
  id: string;
  reference: string;
  accountTitle: string;
  status: string;
}

export const ticketReference = (number: number) => `#T-${String(number).padStart(4, "0")}`;
