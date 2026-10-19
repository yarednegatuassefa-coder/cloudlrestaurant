import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  customerName: varchar("customerName", { length: 160 }),
  phoneNumber: varchar("phoneNumber", { length: 40 }).notNull(),
  serviceMode: varchar("serviceMode", { length: 32 }).notNull(),
  tableNumber: varchar("tableNumber", { length: 32 }),
  deliveryAddress: text("deliveryAddress"),
  preferredTime: varchar("preferredTime", { length: 16 }),
  specialInstructions: text("specialInstructions"),
  guests: int("guests"),
  deliveryFee: int("deliveryFee").default(0).notNull(),
  tip: int("tip").default(0).notNull(),
  confirmationCode: varchar("confirmationCode", { length: 24 }),
  paymentMethod: varchar("paymentMethod", { length: 32 }).default("cash").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["unpaid", "pending", "paid", "refunded"]).default("unpaid").notNull(),
  notifyWhenReady: boolean("notifyWhenReady").default(true).notNull(),
  cancelRequested: boolean("cancelRequested").default(false).notNull(),
  items: text("items").notNull(),
  total: int("total").notNull(),
  prepEstimate: varchar("prepEstimate", { length: 32 }),
  status: mysqlEnum("status", ["pending", "confirmed", "preparing", "ready", "completed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export const preparationSettings = mysqlTable("preparationSettings", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 48 }).notNull().unique(),
  label: varchar("label", { length: 120 }).notNull(),
  minMinutes: int("minMinutes").notNull(),
  maxMinutes: int("maxMinutes").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PreparationSetting = typeof preparationSettings.$inferSelect;
export type InsertPreparationSetting = typeof preparationSettings.$inferInsert;

export const menuControls = mysqlTable("menuControls", {
  id: int("id").autoincrement().primaryKey(),
  itemKey: varchar("itemKey", { length: 120 }).notNull().unique(),
  description: text("description"),
  allergens: varchar("allergens", { length: 500 }),
  tags: varchar("tags", { length: 500 }),
  spiceLevel: varchar("spiceLevel", { length: 24 }),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  isPopular: boolean("isPopular").default(false).notNull(),
  isChefPick: boolean("isChefPick").default(false).notNull(),
  isBreakfast: boolean("isBreakfast").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MenuControl = typeof menuControls.$inferSelect;

export const reservations = mysqlTable("reservations", {
  id: int("id").autoincrement().primaryKey(),
  customerName: varchar("customerName", { length: 160 }).notNull(),
  phoneNumber: varchar("phoneNumber", { length: 40 }).notNull(),
  reservationDate: varchar("reservationDate", { length: 16 }).notNull(),
  reservationTime: varchar("reservationTime", { length: 16 }).notNull(),
  guests: int("guests").notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = typeof reservations.$inferInsert;

export const waitlistEntries = mysqlTable("waitlistEntries", {
  id: int("id").autoincrement().primaryKey(),
  customerName: varchar("customerName", { length: 160 }).notNull(),
  phoneNumber: varchar("phoneNumber", { length: 40 }).notNull(),
  guests: int("guests").notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["waiting", "contacted", "cancelled"]).default("waiting").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WaitlistEntry = typeof waitlistEntries.$inferSelect;
export type InsertWaitlistEntry = typeof waitlistEntries.$inferInsert;

export const inventoryItems = mysqlTable("inventoryItems", {
  id: int("id").autoincrement().primaryKey(),
  itemKey: varchar("itemKey", { length: 120 }).notNull().unique(),
  label: varchar("label", { length: 160 }).notNull(),
  quantity: int("quantity").default(0).notNull(),
  lowThreshold: int("lowThreshold").default(5).notNull(),
  unit: varchar("unit", { length: 32 }).default("units").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type InventoryItem = typeof inventoryItems.$inferSelect;
