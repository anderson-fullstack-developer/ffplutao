import { and, count, desc, eq, gte, sql, type SQL } from "drizzle-orm";

import {
  orderReference,
  type AdminCustomerRow,
  type AdminDashboard,
  type AdminOrderRow,
  type OrderStatus,
} from "@/lib/admin";

import { getDb } from "../db/client";
import { accounts, orders, users } from "../db/schema";

const escapeLike = (text: string) => `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

async function selectOrders(where: SQL | undefined, limit: number): Promise<AdminOrderRow[]> {
  const rows = await getDb()
    .select({
      id: orders.id,
      number: orders.number,
      customerName: users.name,
      customerEmail: users.email,
      accountId: accounts.id,
      accountTitle: accounts.title,
      amountCents: orders.amountCents,
      status: orders.status,
      stripeCheckoutSessionId: orders.stripeCheckoutSessionId,
      stripePaymentIntentId: orders.stripePaymentIntentId,
      createdAt: orders.createdAt,
      paidAt: orders.paidAt,
    })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .innerJoin(accounts, eq(orders.accountId, accounts.id))
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(limit);

  return rows.map(({ number, ...row }) => ({
    ...row,
    reference: orderReference(number),
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
  }));
}

export async function listAdminOrders(filters: {
  q?: string | undefined;
  status?: OrderStatus | undefined;
}): Promise<AdminOrderRow[]> {
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(orders.status, filters.status));
  if (filters.q) {
    const pattern = escapeLike(filters.q);
    const digits = filters.q.replace(/\D/g, "");
    conditions.push(
      sql`(${users.name} ilike ${pattern} or ${users.email} ilike ${pattern} or ${accounts.title} ilike ${pattern}${
        digits ? sql` or ${orders.number}::text = ${String(Number(digits))}` : sql``
      })`,
    );
  }
  return selectOrders(conditions.length ? and(...conditions) : undefined, 500);
}

export async function listCustomers(q?: string): Promise<AdminCustomerRow[]> {
  const purchases = sql<number>`count(${orders.id}) filter (where ${orders.status} = 'PAID')::int`;
  const spent = sql<number>`coalesce(sum(${orders.amountCents}) filter (where ${orders.status} = 'PAID'), 0)::int`;

  const rows = await getDb()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      purchases,
      totalSpentCents: spent,
    })
    .from(users)
    .leftJoin(orders, eq(orders.userId, users.id))
    .where(
      q
        ? sql`(${users.name} ilike ${escapeLike(q)} or ${users.email} ilike ${escapeLike(q)})`
        : undefined,
    )
    .groupBy(users.id)
    .orderBy(desc(users.createdAt))
    .limit(500);

  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

export async function listCustomerOrders(userId: string): Promise<AdminOrderRow[]> {
  return selectOrders(eq(orders.userId, userId), 50);
}

export async function getDashboard(): Promise<AdminDashboard> {
  const db = getDb();
  const since30 = sql`now() - interval '30 days'`;

  const [sales] = await db
    .select({
      total: sql<number>`coalesce(sum(${orders.amountCents}) filter (where ${orders.status} = 'PAID'), 0)::int`,
      last30: sql<number>`coalesce(sum(${orders.amountCents}) filter (where ${orders.status} = 'PAID' and ${orders.paidAt} >= ${since30}), 0)::int`,
      orders: count(),
      paid: sql<number>`count(*) filter (where ${orders.status} = 'PAID')::int`,
    })
    .from(orders);

  const [stock] = await db
    .select({
      available: sql<number>`count(*) filter (where ${accounts.status} = 'AVAILABLE' or (${accounts.status} = 'RESERVED' and ${accounts.reservedUntil} <= now()))::int`,
      reserved: sql<number>`count(*) filter (where ${accounts.status} = 'RESERVED' and ${accounts.reservedUntil} > now())::int`,
      sold: sql<number>`count(*) filter (where ${accounts.status} = 'SOLD')::int`,
    })
    .from(accounts);

  const [customers] = await db
    .select({
      total: count(),
      recent: sql<number>`count(*) filter (where ${users.createdAt} >= ${since30})::int`,
    })
    .from(users)
    .where(eq(users.role, "USER"));

  // Vendas por dia (fuso de Lisboa), últimos 30 dias, incluindo dias sem vendas.
  const daily = await db.execute<{ day: string; cents: number }>(sql`
    select to_char(d, 'DD/MM') as day,
           coalesce(sum(o.amount_cents), 0)::int as cents
    from generate_series(
      (now() at time zone 'Europe/Lisbon')::date - 29,
      (now() at time zone 'Europe/Lisbon')::date,
      interval '1 day'
    ) as d
    left join ${orders} o
      on o.status = 'PAID' and (o.paid_at at time zone 'Europe/Lisbon')::date = d::date
    group by d
    order by d
  `);

  return {
    totalSalesCents: sales?.total ?? 0,
    salesLast30Cents: sales?.last30 ?? 0,
    ordersCount: sales?.orders ?? 0,
    paidOrdersCount: sales?.paid ?? 0,
    availableCount: stock?.available ?? 0,
    reservedCount: stock?.reserved ?? 0,
    soldCount: stock?.sold ?? 0,
    customersCount: customers?.total ?? 0,
    newCustomers30: customers?.recent ?? 0,
    daily: daily.rows.map((row) => ({ day: row.day, cents: Number(row.cents) })),
    recentOrders: await selectOrders(gte(orders.createdAt, sql`now() - interval '90 days'`), 8),
  };
}
