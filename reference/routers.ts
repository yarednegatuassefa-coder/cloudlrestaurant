import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { createOrder, createReservation, createWaitlistEntry, getOrderAnalytics, getPreparationSettings, listInventoryItems, listMenuControls, listOrders, listOrdersByPhone, listReservations, listWaitlistEntries, updateInventoryItem, updateMenuControl, updateOrderPayment, updateOrderStatus, updatePreparationSetting, updateReservationStatus } from "./db";
import { z } from "zod";

export const orderInput = z.object({
  customerName: z.string().max(160).optional(),
  phoneNumber: z.string().min(7).max(40),
  serviceMode: z.string().max(32),
  tableNumber: z.string().max(32).optional(),
  deliveryAddress: z.string().max(1000).optional(),
  preferredTime: z.string().max(16).optional(),
  specialInstructions: z.string().max(2000).optional(),
  guests: z.number().int().min(1).max(30).optional(),
  deliveryFee: z.number().int().nonnegative().max(100000).default(0),
  tip: z.number().int().nonnegative().max(100000).default(0),
  confirmationCode: z.string().max(24).optional(),
  paymentMethod: z.enum(["cash", "telebirr", "cbe-birr", "hello-cash"]).default("cash"),
  paymentStatus: z.enum(["unpaid", "pending", "paid", "refunded"]).default("unpaid"),
  notifyWhenReady: z.boolean().default(true),
  items: z.string().min(2),
  total: z.number().int().nonnegative(),
  prepEstimate: z.string().max(32).optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  orders: router({
    create: publicProcedure.input(orderInput).mutation(async ({ input }) => {
      const id = await createOrder({
        ...input,
        customerName: input.customerName || null,
        tableNumber: input.tableNumber || null,
        deliveryAddress: input.deliveryAddress || null,
        preferredTime: input.preferredTime || null,
        specialInstructions: input.specialInstructions || null,
        guests: input.guests || null,
        deliveryFee: input.deliveryFee,
        tip: input.tip,
        confirmationCode: input.confirmationCode || null,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentStatus,
        notifyWhenReady: input.notifyWhenReady,
        status: "pending",
      });
      return { id, status: "pending" as const };
    }),
    history: publicProcedure.input(z.object({ phoneNumber: z.string().min(7).max(40) })).query(async ({ input }) => {
      return listOrdersByPhone(input.phoneNumber.trim());
    }),
    list: adminProcedure.query(async () => listOrders()),
    updateStatus: adminProcedure.input(z.object({ id: z.number().int(), status: z.enum(["pending", "confirmed", "preparing", "ready", "completed"]) })).mutation(async ({ input }) => {
      await updateOrderStatus(input.id, input.status);
      return { success: true as const };
    }),
    updatePayment: adminProcedure.input(z.object({ id: z.number().int(), paymentStatus: z.enum(["unpaid", "pending", "paid", "refunded"]) })).mutation(async ({ input }) => {
      await updateOrderPayment(input.id, input.paymentStatus);
      return { success: true as const };
    }),
  }),
  prepSettings: router({
    get: publicProcedure.query(async () => getPreparationSettings()),
    update: adminProcedure.input(z.object({ category: z.string().min(1).max(48), minMinutes: z.number().int().min(1).max(240), maxMinutes: z.number().int().min(1).max(240) }).refine((value) => value.maxMinutes >= value.minMinutes, { message: "Maximum must be at least the minimum" })).mutation(async ({ input }) => {
      await updatePreparationSetting(input.category, input.minMinutes, input.maxMinutes);
      return { success: true as const };
    }),
  }),
  menuControls: router({
    list: publicProcedure.query(() => listMenuControls()),
    update: adminProcedure.input(z.object({ itemKey: z.string().min(1).max(120), description: z.string().max(2000).optional(), allergens: z.string().max(500).optional(), tags: z.string().max(500).optional(), spiceLevel: z.string().max(24).optional(), isAvailable: z.boolean().optional(), isPopular: z.boolean().optional(), isChefPick: z.boolean().optional(), isBreakfast: z.boolean().optional() })).mutation(({ input }) => updateMenuControl(input.itemKey, input)),
  }),
  reservations: router({
    create: publicProcedure.input(z.object({ customerName: z.string().min(2).max(160), phoneNumber: z.string().min(7).max(40), reservationDate: z.string().max(16), reservationTime: z.string().max(16), guests: z.number().int().min(1).max(30), notes: z.string().max(1000).optional() })).mutation(async ({ input }) => ({ id: await createReservation({ ...input, notes: input.notes || null, status: "pending" }) })),
    list: adminProcedure.query(() => listReservations()),
    updateStatus: adminProcedure.input(z.object({ id: z.number().int(), status: z.enum(["pending", "confirmed", "cancelled"]) })).mutation(async ({ input }) => { await updateReservationStatus(input.id, input.status); return { success: true as const }; }),
  }),
  waitlist: router({
    create: publicProcedure.input(z.object({ customerName: z.string().min(2).max(160), phoneNumber: z.string().min(7).max(40), guests: z.number().int().min(1).max(30), notes: z.string().max(1000).optional() })).mutation(async ({ input }) => ({ id: await createWaitlistEntry({ ...input, notes: input.notes || null, status: "waiting" }) })),
    list: adminProcedure.query(() => listWaitlistEntries()),
  }),
  inventory: router({
    list: adminProcedure.query(() => listInventoryItems()),
    update: adminProcedure.input(z.object({ itemKey: z.string().min(1).max(120), label: z.string().min(1).max(160), quantity: z.number().int().min(0), lowThreshold: z.number().int().min(0), unit: z.string().min(1).max(32) })).mutation(async ({ input }) => { await updateInventoryItem(input.itemKey, input.label, input.quantity, input.lowThreshold, input.unit); return { success: true as const }; }),
  }),
  analytics: router({
    summary: adminProcedure.query(() => getOrderAnalytics()),
  }),
});

export type AppRouter = typeof appRouter;
