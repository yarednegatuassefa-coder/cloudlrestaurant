# Optional local Nemotron inference

## Scope

CloudL includes a small server-side HTTP adapter for NVIDIA Nemotron 3.5 Bolt E4B. It is a transport-only integration for local experiments and synthetic smoke tests. It is **disabled by default** and is not used by checkout, order, payment, delivery-fee or tracking routes.

It does not download model weights, install llama.cpp, access the database, send customer data, or provide a customer/staff UI.

## Requirements

- A machine capable of running the selected quantized model and llama.cpp.
- The official `nvidia/NVIDIA-Nemotron-3.5-Bolt-E4B-4GB` Q4_K_M model file.
- A local llama.cpp server exposing OpenAI-compatible `/v1/models` and `/v1/chat/completions` routes.
- Review of the upstream OpenMDW-1.1 license and applicable Gemma 4 terms before commercial redistribution or deployment.

Upstream instructions: https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Bolt-E4B-4GB

The model's nominal quantized file size is not total runtime RAM. Start with a short context and measure memory and latency. Do not assume an older mobile GPU is supported or will accelerate inference.

## Configure

Set these environment variables only on the machine running CloudL's server-side code:

```dotenv
NEMOTRON_ENABLED=true
NEMOTRON_BASE_URL=http://127.0.0.1:8080/v1
NEMOTRON_MODEL=nemotron-bolt
NEMOTRON_TIMEOUT_MS=20000
```

The model identifier must exactly match an identifier returned by the local server's `GET /v1/models`. The example above assumes the local llama.cpp server is configured with the `nemotron-bolt` alias. If it returns another ID, use that exact ID.

The adapter accepts only loopback or private IPv4/IPv6 addresses, HTTP(S), and the `/v1` path. Public endpoints, URL credentials, query strings and fragments are rejected. Keep the listener private; this check is defense-in-depth, not a replacement for host firewalling or network isolation.

## Run the synthetic smoke test

```sh
NEMOTRON_ENABLED=true \
NEMOTRON_BASE_URL=http://127.0.0.1:8080/v1 \
NEMOTRON_MODEL=nemotron-bolt \
npm run ai:nemotron:smoke
```

The smoke test sends only a fixed synthetic connectivity prompt. It does not read orders, customers, staff accounts, payment records or the database.

## Programmatic use

```js
import { createNemotronClient } from "../lib/server/nemotron-client.mjs";

const nemotron = createNemotronClient();
if (nemotron.enabled) {
  const result = await nemotron.complete({
    system: "Classify the synthetic example. Do not perform actions.",
    user: "Example: Do you have shiro?",
    maxTokens: 80,
    temperature: 0,
  });
  // Treat result.text as untrusted model output.
}
```

The adapter bounds system/user prompt length, output tokens, response length and request time. Thinking is disabled and conversational mode is enabled by default for this low-latency adapter. It returns text only; it does not execute tools or mutate application state.

## Hard boundaries

- Never call this adapter from public order creation, order editing, payment, payment verification, refunds, delivery-zone matching or fee calculation.
- Do not send names, phone numbers, addresses, tracking tokens, payment references, patient data, secrets or raw customer conversations.
- Do not trust model output as a price, stock level, delivery eligibility decision, payment status or authorization.
- A staff-facing endpoint requires a verified staff-authentication and authorization boundary before implementation. This change does not create one.
- A Vercel-hosted production function cannot reach a developer's `127.0.0.1`. Do not expose the model server to the public internet to work around this. A private hosted worker/network design requires separate security review and explicit approval.
- If the model is disabled or unreachable, CloudL's normal application behavior remains unchanged.

## Current status

- Adapter and unit tests: implemented.
- Local model weights and llama.cpp: not installed by this change.
- Live inference: not tested because no local model endpoint is configured.
- Customer/staff workflow or UI: not connected.
- Production deployment and secrets: unchanged.
