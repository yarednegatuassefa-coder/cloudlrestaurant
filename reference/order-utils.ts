export type PreparationSetting = {
  category: string;
  label: string;
  minMinutes: number;
  maxMinutes: number;
};

export const defaultPreparationSettings: PreparationSetting[] = [
  { category: "american", label: "American foods", minMinutes: 20, maxMinutes: 30 },
  { category: "non-fasting", label: "Ethiopian non-fasting", minMinutes: 25, maxMinutes: 35 },
  { category: "fasting", label: "Ethiopian fasting", minMinutes: 20, maxMinutes: 30 },
];

export function getPreparationEstimate(itemCount: number): string {
  const safeCount = Math.max(1, Math.floor(itemCount));
  const minimum = 20 + Math.min(20, (safeCount - 1) * 5);
  return `${minimum}–${minimum + 10} min`;
}

export function getOrderPreparationEstimate(
  items: Array<{ category: string; qty: number }>,
  settings: PreparationSetting[] = defaultPreparationSettings,
): string {
  const settingMap = new Map(settings.map((setting) => [setting.category, setting]));
  const applicable = items.map((item) => settingMap.get(item.category)).filter((setting): setting is PreparationSetting => Boolean(setting));
  if (applicable.length === 0) return getPreparationEstimate(items.reduce((sum, item) => sum + item.qty, 0));
  const quantity = Math.max(1, items.reduce((sum, item) => sum + item.qty, 0));
  const extra = Math.min(20, Math.max(0, quantity - 1) * 3);
  const minimum = Math.max(...applicable.map((setting) => setting.minMinutes)) + extra;
  const maximum = Math.max(...applicable.map((setting) => setting.maxMinutes)) + extra;
  return `${minimum}–${maximum} min`;
}

export function getNewPendingOrderIds(
  orders: Array<{ id: number; status: string }>,
  previouslyKnownIds: ReadonlySet<number>,
): number[] {
  return orders.filter((order) => order.status === "pending" && !previouslyKnownIds.has(order.id)).map((order) => order.id);
}
