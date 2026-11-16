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
