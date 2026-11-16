/**
 * Optional local Nemotron client for CloudL.
 *
 * This is a transport adapter only. It does not access the database, order
 * state, payment state, customer records, or any production business action.
 */
const DEFAULT_BASE_URL = "http://127.0.0.1:8080/v1";
const DEFAULT_MODEL = "nemotron-bolt";
const MAX_SYSTEM_CHARS = 4_000;
const MAX_USER_CHARS = 8_000;
const MAX_RESPONSE_CHARS = 16_000;

export class NemotronError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "NemotronError";
    this.code = code;
  }
}

function isPrivateHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd")) return true;

  const octets = host.split(".");
  if (octets.length !== 4 || octets.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return false;
  const [a, b] = octets.map(Number);
  return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

export function validateNemotronBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new NemotronError("invalid_config", "NEMOTRON_BASE_URL must be a valid local inference URL.");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new NemotronError("invalid_config", "Nemotron URL must use HTTP(S) without credentials, query parameters or fragments.");
  }
  if (!isPrivateHost(url.hostname)) {
    throw new NemotronError("unsafe_endpoint", "Nemotron endpoint must resolve to loopback or a private IP address; public hosts are refused.");
  }
  if (url.pathname !== "/v1" && url.pathname !== "/v1/") {
    throw new NemotronError("invalid_config", "Nemotron base URL path must be /v1.");
  }
  url.pathname = "/v1/";
  return url.toString();
}

export function getNemotronConfig(env = process.env) {
  if (env.NEMOTRON_ENABLED !== "true") return { enabled: false };
  const baseUrl = validateNemotronBaseUrl(env.NEMOTRON_BASE_URL || DEFAULT_BASE_URL);
  const model = (env.NEMOTRON_MODEL || DEFAULT_MODEL).trim();
  if (!/^[A-Za-z0-9._:/-]{1,160}$/.test(model)) {
    throw new NemotronError("invalid_config", "NEMOTRON_MODEL contains unsupported characters.");
  }
  const timeoutMs = Number(env.NEMOTRON_TIMEOUT_MS || 20_000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 60_000) {
    throw new NemotronError("invalid_config", "NEMOTRON_TIMEOUT_MS must be between 1000 and 60000.");
  }
  return { enabled: true, baseUrl, model, timeoutMs };
}

function normalizeContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.filter((part) => part && part.type === "text" && typeof part.text === "string")
    .map((part) => part.text).join("");
}

export function createNemotronClient({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const config = getNemotronConfig(env);
  return Object.freeze({
    enabled: config.enabled,
    async complete({ system, user, maxTokens = 256, temperature = 0.2 } = {}) {
      if (!config.enabled) throw new NemotronError("disabled", "Nemotron is disabled. Set NEMOTRON_ENABLED=true to opt in.");
      if (typeof fetchImpl !== "function") throw new NemotronError("unavailable", "This Node.js runtime does not provide fetch.");
      if (typeof system !== "string" || system.length < 1 || system.length > MAX_SYSTEM_CHARS) {
        throw new NemotronError("invalid_input", "System instruction must contain 1–4000 characters.");
      }
      if (typeof user !== "string" || user.trim().length < 1 || user.length > MAX_USER_CHARS) {
        throw new NemotronError("invalid_input", "User prompt must contain 1–8000 characters.");
      }
      if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 1_024) {
        throw new NemotronError("invalid_input", "maxTokens must be an integer between 1 and 1024.");
      }
      if (typeof temperature !== "number" || !Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
        throw new NemotronError("invalid_input", "temperature must be between 0 and 2.");
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
      try {
        const response = await fetchImpl(new URL("chat/completions", config.baseUrl), {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            model: config.model,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            temperature,
            top_p: 0.95,
            max_tokens: maxTokens,
            stream: false,
            chat_template_kwargs: {
              enable_thinking: false,
              conversational_mode: true,
            },
          }),
        });
        if (!response.ok) {
          throw new NemotronError("upstream_error", `Local Nemotron server returned HTTP ${response.status}.`);
        }
        let payload;
        try {
          payload = await response.json();
        } catch {
          throw new NemotronError("invalid_response", "Local Nemotron server returned invalid JSON.");
        }
        const content = normalizeContent(payload?.choices?.[0]?.message?.content);
        if (!content || content.length > MAX_RESPONSE_CHARS) {
          throw new NemotronError("invalid_response", "Local Nemotron response was empty or exceeded the response limit.");
        }
        return { text: content, model: config.model };
      } catch (error) {
        if (error instanceof NemotronError) throw error;
        if (controller.signal.aborted) {
          throw new NemotronError("timeout", "Local Nemotron request timed out.");
        }
        throw new NemotronError("unavailable", "Local Nemotron server could not be reached.", { cause: error });
      } finally {
        clearTimeout(timeout);
      }
    },
  });
}
