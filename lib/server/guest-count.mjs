const invalidDineInGuestCountMessage = "For dine-in, enter a whole number from 1 to 40 or leave it blank. / ለመመገቢያ ከ1 እስከ 40 ያለ ሙሉ ቁጥር ያስገቡ ወይም ባዶ ይተዉት።";

/**
 * Validate an optional guest count and discard it for non-dine-in orders.
 * @param {unknown} fulfillment
 * @param {unknown} value
 * @returns {{ok: true, guestCount: number | null} | {ok: false, error: string}}
 */
export function normalizeGuestCount(fulfillment, value) {
  if (fulfillment !== "dine_in") return { ok: true, guestCount: null };
  if (value === null || value === undefined || value === "") return { ok: true, guestCount: null };
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 40) {
    return { ok: false, error: invalidDineInGuestCountMessage };
  }
  return { ok: true, guestCount: value };
}
