const MAX_INPUT_CHARS = 12_000;
const MAX_OUTPUT_CHARS = 6_000;

const FORBIDDEN_PATTERNS = [
  /\b(payment|transfer)\s+(is\s+)?(paid|verified|complete|received)\b/i,
  /\border\s+(is\s+)?(confirmed|accepted|ready|preparing)\b/i,
  /\b(change|update|set)\s+(the\s+)?(price|availability|status)\b/i,
  /\btracking\s+(token|link)\b/i,
];

function cleanText(value, limit) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, limit);
}

function redactSensitive(value) {
  return cleanText(value, 2_000)
    .replace(/\b(?:token|secret|password|api[_ -]?key)\s*[:=]\s*\S+/gi, "[REDACTED]")
    .replace(/\b(?:tracking|order)[_-]?(?:token|secret)\s*[:=]\s*\S+/gi, "[REDACTED]")
    .replace(/\+?\d[\d ()-]{7,}\d/g, "[PHONE REDACTED]");
}

export function buildDraftCopilotInput({ menuItems = [], approvedCopy = [], task = "" } = {}) {
  const payload = {
    mode: "draft_only",
    task: cleanText(task, 1_000),
    menuItems: Array.isArray(menuItems) ? menuItems.slice(0, 100).map((item) => ({
      id: cleanText(item?.id, 80),
      name: cleanText(item?.name, 160),
      nameAm: cleanText(item?.nameAm, 160),
      category: cleanText(item?.category, 80),
      priceEtb: Number.isFinite(item?.priceEtb) ? item.priceEtb : null,
      available: item?.available === true,
    })) : [],
    approvedCopy: Array.isArray(approvedCopy) ? approvedCopy.slice(0, 30).map((copy) => redactSensitive(copy)) : [],
    forbiddenActions: ["confirm orders", "mark payments paid", "change prices", "change availability", "send messages", "expose tracking tokens"],
  };
  const serialized = JSON.stringify(payload);
  if (serialized.length > MAX_INPUT_CHARS) throw new Error("draft_copilot_input_too_large");
  return payload;
}

export function validateDraftCopilotOutput(text, { knownMenuNames = [] } = {}) {
  const output = cleanText(text, MAX_OUTPUT_CHARS);
  if (!output) return { ok: false, code: "empty_output" };
  if (String(text ?? "").length > MAX_OUTPUT_CHARS) return { ok: false, code: "output_too_large" };
  const forbidden = FORBIDDEN_PATTERNS.find((pattern) => pattern.test(output));
  if (forbidden) return { ok: false, code: "consequential_claim" };
  const names = knownMenuNames.map((name) => cleanText(name, 160).toLowerCase()).filter(Boolean);
  const unsupportedPrice = /(?:(?:ETB|birr)\s*\d[\d,.]*|\d[\d,.]*\s*(?:ETB|birr))/i.test(output) && names.length === 0;
  if (unsupportedPrice) return { ok: false, code: "unsupported_price_claim" };
  return { ok: true, text: output, requiresHumanReview: true };
}

export const draftCopilotLimits = Object.freeze({ maxInputChars: MAX_INPUT_CHARS, maxOutputChars: MAX_OUTPUT_CHARS, maxMenuItems: 100 });
