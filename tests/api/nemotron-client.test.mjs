import test from "node:test";
import assert from "node:assert/strict";
import { createNemotronClient, getNemotronConfig, NemotronError, validateNemotronBaseUrl } from "../../lib/server/nemotron-client.mjs";

const enabledEnv = {
  NEMOTRON_ENABLED: "true",
  NEMOTRON_BASE_URL: "http://127.0.0.1:8080/v1",
  NEMOTRON_MODEL: "nemotron-bolt",
  NEMOTRON_TIMEOUT_MS: "2000",
};

test("Nemotron is disabled by default and refuses calls while disabled", async () => {
  assert.deepEqual(getNemotronConfig({}), { enabled: false });
  const client = createNemotronClient({ env: {}, fetchImpl: async () => { throw new Error("must not call"); } });
  assert.equal(client.enabled, false);
  await assert.rejects(client.complete({ system: "You are helpful.", user: "Hello" }), { code: "disabled" });
});

test("endpoint validation accepts loopback and private LAN addresses only", () => {
  assert.equal(validateNemotronBaseUrl("http://127.0.0.1:8080/v1"), "http://127.0.0.1:8080/v1/");
  assert.equal(validateNemotronBaseUrl("http://192.168.1.20:8080/v1"), "http://192.168.1.20:8080/v1/");
  assert.throws(() => validateNemotronBaseUrl("https://example.com/v1"), { code: "unsafe_endpoint" });
  assert.throws(() => validateNemotronBaseUrl("http://10.0.0.2/v1?token=secret"), { code: "invalid_config" });
  assert.throws(() => validateNemotronBaseUrl("http://user:pass@127.0.0.1:8080/v1"), { code: "invalid_config" });
  assert.throws(() => validateNemotronBaseUrl("http://127.0.0.1:8080/other"), { code: "invalid_config" });
});

test("client sends a bounded OpenAI-compatible request and extracts the response", async () => {
  let request;
  const client = createNemotronClient({
    env: enabledEnv,
    fetchImpl: async (url, options) => {
      request = { url: String(url), options, body: JSON.parse(options.body) };
      return { ok: true, json: async () => ({ choices: [{ message: { content: "Classified as menu_question." } }] }) };
    },
  });
  const result = await client.complete({ system: "Classify only; do not perform actions.", user: "Do you have shiro?", maxTokens: 80 });
  assert.deepEqual(result, { text: "Classified as menu_question.", model: "nemotron-bolt" });
  assert.equal(request.url, "http://127.0.0.1:8080/v1/chat/completions");
  assert.equal(request.options.method, "POST");
  assert.equal(request.body.model, "nemotron-bolt");
  assert.equal(request.body.stream, false);
  assert.deepEqual(request.body.chat_template_kwargs, { enable_thinking: false, conversational_mode: true });
  assert.equal(request.body.messages[1].content, "Do you have shiro?");
});

test("client rejects oversized prompts before network access", async () => {
  let called = false;
  const client = createNemotronClient({ env: enabledEnv, fetchImpl: async () => { called = true; } });
  await assert.rejects(client.complete({ system: "ok", user: "x".repeat(8_001) }), { code: "invalid_input" });
  assert.equal(called, false);
});

test("client reports upstream and malformed-response failures without exposing response bodies", async () => {
  const failing = createNemotronClient({ env: enabledEnv, fetchImpl: async () => ({ ok: false, status: 503, text: async () => "private upstream details" }) });
  await assert.rejects(failing.complete({ system: "System", user: "Hello" }), (error) => error instanceof NemotronError && error.code === "upstream_error" && !error.message.includes("private"));
  const malformed = createNemotronClient({ env: enabledEnv, fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [] }) }) });
  await assert.rejects(malformed.complete({ system: "System", user: "Hello" }), { code: "invalid_response" });
});

test("client turns an aborted request into a bounded timeout error", async () => {
  const client = createNemotronClient({
    env: { ...enabledEnv, NEMOTRON_TIMEOUT_MS: "1000" },
    fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }),
  });
  await assert.rejects(client.complete({ system: "System", user: "Hello" }), { code: "timeout" });
});
