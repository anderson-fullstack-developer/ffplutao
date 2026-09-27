import type { Order } from "@/types";

export const orders: Order[] = [
  {
    id: "plu-2026-00128",
    reference: "#PLU-00128",
    accountId: "plu-128",
    accountTitle: "Conta Free Fire #128",
    customerName: "João Martins",
    customerEmail: "joao.martins@example.test",
    amount: 69.9,
    status: "pago",
    paymentMethod: "Cartão (demo)",
    date: "2026-09-26",
    credentials: {
      login: "demo-account@example.test",
      password: "DemoPassword123",
      recoveryEmail: "demo-recovery@example.test",
      notes: "Credenciais fictícias apenas para demonstração da interface.",
    },
  },
  {
    id: "plu-2026-00119",
    reference: "#PLU-00119",
    accountId: "plu-077",
    accountTitle: "Conta Free Fire #77",
    customerName: "João Martins",
    customerEmail: "joao.martins@example.test",
    amount: 45.5,
    status: "pendente",
    paymentMethod: "MB Way (demo)",
    date: "2026-09-14",
    credentials: {
      login: "demo-pending@example.test",
      password: "DemoPassword456",
      recoveryEmail: "demo-recovery@example.test",
      notes: "Disponível após confirmação do pagamento.",
    },
  },
  {
    id: "plu-2026-00104",
    reference: "#PLU-00104",
    accountId: "plu-034",
    accountTitle: "Conta Free Fire #34",
    customerName: "Rita Nunes",
    customerEmail: "rita.nunes@example.test",
    amount: 32.0,
    status: "cancelado",
    paymentMethod: "Cartão (demo)",
    date: "2026-08-21",
    credentials: {
      login: "demo-cancelled@example.test",
      password: "DemoPassword789",
      recoveryEmail: "demo-recovery@example.test",
      notes: "Pedido cancelado.",
    },
  },
  {
    id: "plu-2026-00097",
    reference: "#PLU-00097",
    accountId: "plu-112",
    accountTitle: "Conta Free Fire #112",
    customerName: "Miguel Sousa",
    customerEmail: "miguel.sousa@example.test",
    amount: 89.9,
    status: "pago",
    paymentMethod: "Cartão (demo)",
    date: "2026-08-12",
    credentials: {
      login: "demo-sold@example.test",
      password: "DemoPassword321",
      recoveryEmail: "demo-recovery@example.test",
      notes: "Credenciais fictícias.",
    },
  },
  {
    id: "plu-2026-00088",
    reference: "#PLU-00088",
    accountId: "plu-150",
    accountTitle: "Conta Free Fire #150",
    customerName: "Ana Ferreira",
    customerEmail: "ana.ferreira@example.test",
    amount: 59.0,
    status: "reembolsado",
    paymentMethod: "MB Way (demo)",
    date: "2026-07-30",
    credentials: {
      login: "demo-refund@example.test",
      password: "DemoPassword654",
      recoveryEmail: "demo-recovery@example.test",
      notes: "Pedido reembolsado.",
    },
  },
];

export const myOrders = orders.filter((o) => o.customerEmail === "joao.martins@example.test");

export function getOrder(id: string): Order | undefined {
  return orders.find((o) => o.id === id);
}
