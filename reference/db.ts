import { desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertOrder, InsertReservation, InsertUser, InsertWaitlistEntry, inventoryItems, menuControls, orders, preparationSettings, reservations, users, waitlistEntries } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createOrder(order: InsertOrder) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(orders).values(order);
  return Number(result[0].insertId);
}

export async function listOrders() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100);
}

export async function listOrdersByPhone(phoneNumber: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select({
    id: orders.id,
    status: orders.status,
    total: orders.total,
    prepEstimate: orders.prepEstimate,
    items: orders.items,
    createdAt: orders.createdAt,
    updatedAt: orders.updatedAt,
  }).from(orders).where(eq(orders.phoneNumber, phoneNumber)).orderBy(desc(orders.createdAt)).limit(10);
}

export async function updateOrderStatus(id: number, status: "pending" | "confirmed" | "preparing" | "ready" | "completed") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, id));
}

export async function updateOrderPayment(id: number, paymentStatus: "unpaid" | "pending" | "paid" | "refunded") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(orders).set({ paymentStatus, updatedAt: new Date() }).where(eq(orders.id, id));
}

export async function getPreparationSettings() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  let result = await db.select().from(preparationSettings);
  if (result.length === 0) {
    const defaults = [
      { category: "american", label: "American foods", minMinutes: 20, maxMinutes: 30 },
      { category: "non-fasting", label: "Ethiopian non-fasting", minMinutes: 25, maxMinutes: 35 },
      { category: "fasting", label: "Ethiopian fasting", minMinutes: 20, maxMinutes: 30 },
    ];
    await db.insert(preparationSettings).values(defaults);
    result = await db.select().from(preparationSettings);
  }
  return result;
}

export async function updatePreparationSetting(category: string, minMinutes: number, maxMinutes: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(preparationSettings).set({ minMinutes, maxMinutes, updatedAt: new Date() }).where(eq(preparationSettings.category, category));
}

export async function listMenuControls() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(menuControls).orderBy(menuControls.itemKey);
}

export async function updateMenuControl(itemKey: string, values: Partial<typeof menuControls.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(menuControls).values({ itemKey, ...values }).onDuplicateKeyUpdate({ set: { ...values, updatedAt: new Date() } });
}

export async function createReservation(input: InsertReservation) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(reservations).values(input);
  return Number(result[0].insertId);
}

export async function listReservations() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(reservations).orderBy(desc(reservations.createdAt)).limit(100);
}

export async function updateReservationStatus(id: number, status: "pending" | "confirmed" | "cancelled") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(reservations).set({ status, updatedAt: new Date() }).where(eq(reservations.id, id));
}

export async function createWaitlistEntry(input: InsertWaitlistEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(waitlistEntries).values(input);
  return Number(result[0].insertId);
}

export async function listWaitlistEntries() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(waitlistEntries).orderBy(desc(waitlistEntries.createdAt)).limit(100);
}

export async function listInventoryItems() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(inventoryItems).orderBy(inventoryItems.label);
}

export async function updateInventoryItem(itemKey: string, label: string, quantity: number, lowThreshold: number, unit: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(inventoryItems).values({ itemKey, label, quantity, lowThreshold, unit }).onDuplicateKeyUpdate({ set: { label, quantity, lowThreshold, unit, updatedAt: new Date() } });
}

export async function getOrderAnalytics() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const summary = await db.select({ totalOrders: sql<number>`count(*)`, revenue: sql<number>`coalesce(sum(${orders.total}), 0)` }).from(orders);
  const statuses = await db.select({ status: orders.status, count: sql<number>`count(*)` }).from(orders).groupBy(orders.status);
  return { totalOrders: Number(summary[0]?.totalOrders ?? 0), revenue: Number(summary[0]?.revenue ?? 0), statuses };
}
