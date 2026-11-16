#!/usr/bin/env node
import { createNemotronClient } from "../lib/server/nemotron-client.mjs";

const client = createNemotronClient();
if (!client.enabled) {
  console.error("Nemotron is disabled. Set NEMOTRON_ENABLED=true before running this synthetic smoke test.");
  process.exit(1);
}

try {
  const result = await client.complete({
    system: "You are a local model connectivity test. Reply with exactly: NEMOTRON_OK",
    user: "Reply with the exact text NEMOTRON_OK. Do not add anything else.",
    maxTokens: 24,
    temperature: 0,
  });
  console.log(JSON.stringify({ status: "connected", model: result.model, response: result.text }, null, 2));
  if (!result.text.includes("NEMOTRON_OK")) process.exitCode = 2;
} catch (error) {
  console.error(error instanceof Error ? error.message : "Nemotron smoke test failed.");
  process.exitCode = 1;
}
