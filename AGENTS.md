# CloudLrestaurant Agent Instructions

## Shared skills and portfolio standards
Home is the portfolio coordination repository, not a source-code monorepo. Its shared skills and standards are available at:
- [Home repository guide](https://github.com/yarednegatuassefa-coder/home/blob/main/README.md)
- [Home agent instructions](https://github.com/yarednegatuassefa-coder/home/blob/main/AGENTS.md)
- [Shared skill catalog and routing](https://github.com/yarednegatuassefa-coder/home/blob/main/skills/README.md)
- [Portfolio map and instruction precedence](https://github.com/yarednegatuassefa-coder/home/blob/main/architecture/portfolio-map.md)

Before a task that matches a specialized workflow, consult the Home skill catalog and read the relevant skill and integration guidance. Examples: substantial UI/UX work or demos → portfolio design research and the matching design/demo skill; schema, data-model, or migration work → portfolio database architecture; an explicitly requested security audit → portfolio security-audit guidance and its upstream audit workflow; SEO/GEO → portfolio SEO; maps or delivery-zone analysis → portfolio geospatial; documentation/code review/project planning/social content → the matching Home skill; research-led media or video → Research-to-Video, Animated Shorts, or Motion Studio only when that deliverable is requested. The Home catalog is the source of truth for the full, current collection.

Use only the skill or skills relevant to the requested deliverable; do not chain or execute every skill just because it is available. CloudLrestaurant's own instructions and requirements take precedence over Home guidance when project-specific details differ.

## Harness lifecycle
Before substantial work, read `harness/README.md`, `harness/feature-list.json` and the latest `harness/progress.md` entry. Run `npm run harness:check` before project tests. Record acceptance evidence and handoff state before closing a task.

## CloudLrestaurant safeguards
Preserve authentication, server-side authorization, database permissions, tenant isolation, order-state integrity, payment handling, customer privacy, and idempotency. Treat orders, payments, customer records, and operational data as sensitive. Never treat a customer order request as confirmed payment or a confirmed order without the required staff-side verification. Do not use production data or apply live migrations as part of a skill workflow without explicit authorization.

Skill availability does not authorize tool/dependency installation, paid API or model use, external account connections, production access, migrations, deployment, or publication. Obtain separate explicit authorization before any such cost-incurring or externally consequential action. Do not copy the Home skill collection into this repository; follow its catalog and load only relevant workflows when needed.


## Workflow quality and evaluation
Follow the portfolio [Workflow Quality and Evaluation Standard](https://github.com/yarednegatuassefa-coder/home/blob/main/standards/workflow-quality.md) and this repository's [workflow governance plan](docs/workflow-governance.md) when creating or changing repeated/agent-assisted workflows. Require order/payment invariants, trajectory and outcome tests, idempotency, safe recovery, and human approval at consequential boundaries. Do not enable telemetry or expose customer/order/payment data without separate approval.

## Code-mode agent architecture
For any AI/tool orchestration task, consult the portfolio [Code-Mode Agent Engineering Standard](https://github.com/yarednegatuassefa-coder/home/blob/main/standards/code-mode-agent-engineering.md), [Portfolio Code-Mode skill](https://github.com/yarednegatuassefa-coder/home/blob/main/skills/portfolio-code-mode/SKILL.md), and this repository's `docs/agent-code-mode.md`. This guidance does not grant production access, external model use, patient/customer data transfer, writes, deployment or other approvals. Project-specific safeguards above remain authoritative.


## Emil Kowalski design-engineering skills

For interface and interaction work, use the upstream [Emil Kowalski skills](https://github.com/emilkowalski/skills) through the shared Home skill installation. The Home catalog is the portfolio routing reference: https://github.com/yarednegatuassefa-coder/home/blob/main/skills/README.md.

Apply only the skill that matches the task; do not invoke the entire collection by default. This is a customer ordering and staff-operations web app. Prioritize fast menu discovery, cart/checkout clarity, order-state comprehension, mobile touch ergonomics, and resilient loading/error states. Keep ordering, payment status, and staff actions unambiguous; motion must never imply payment or order confirmation that the server has not established.

- **Design baseline:** consult `emil-design-eng` for relevant UI/animation decisions; preserve the product's existing design tokens and component conventions.
- **Build motion:** use `animate` for requested motion, `choreograph` for coordinated sequences, and `gestures` / `animate-expo` only when the product actually has gesture or Expo-native interactions.
- **Audit and repair:** use `review-animations` for changed motion, `improve-animations` for a codebase-wide motion audit and plans, `animation-performance` for dropped frames, and `remove-animations` when motion is unnecessary.
- **Responsive/mobile QA:** use `mobile-native` for mobile-web behavior and `break-ui` for worst-case content and layout stress tests.
- **Architecture and exploration:** use `pick-ui-library` before adding a UI dependency; use `prototype` when comparing interaction concepts; use `apple-design` only when its platform principles fit the product.
- **Learning and routing:** use `ask-emil` when the right design skill or sequence is unclear; use `learn-taste` at the end of a design session to capture approved corrections as durable project rules. Use `ask-sonner` only if this project uses Sonner.

**Quality gates:** motion must have a user-facing purpose, respect frequency and performance budgets, support `prefers-reduced-motion`, and avoid animating high-frequency or information-dense workflows. Prefer no animation over decorative motion. Keep keyboard and primary operational flows immediate. Reuse existing tokens and dependencies; do not add a library or alter the visual system without task scope and approval. Validate desktop/mobile, keyboard/focus, reduced-motion, loading/empty/error states, and long/unusual content as applicable.

These skills do not override this repository's domain, security, privacy, accessibility, financial, clinical, or release safeguards. Skill availability is not authorization to install dependencies, call paid services, access production data, publish, or deploy.
