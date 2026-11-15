export type GuestCountValidation =
  | { ok: true; guestCount: number | null }
  | { ok: false; error: string };

export function normalizeGuestCount(fulfillment: unknown, value: unknown): GuestCountValidation;
