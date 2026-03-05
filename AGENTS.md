# Dead Party Media Agent Operating Guide

This file is the root operating contract for autonomous agents in this repo.
Use it as the first source of workflow truth, then route into `.agents`.

## GitHub Is Source Of Truth

Track planning and delivery in GitHub, not only local context.

- **Issues** are the source of truth for planned work (`Feature`, `Bug`, `Chore`).
- **PRs** are the review and merge unit, and must link to an issue.
- **Project board** is the live status surface with:
  `Backlog -> In Progress -> In Review -> Done`.

## Required Delivery Loop

Follow this loop for all non-trivial work:

1. **Plan**
   - Review relevant `.agents` skills before implementation planning.
2. **Create or reference an Issue**
   - Use one of the required issue templates.
   - Issue title must start with:
     - `feat: ...`
     - `fix: ...`
     - `chore: ...`
3. **Create feature/fix/chore branch from `master`**
   - Branch naming is required:
     - `feat/<slug>-<issueNumber>`
     - `fix/<slug>-<issueNumber>`
     - `chore/<slug>-<issueNumber>`
4. **Implement + test**
   - Keep changes scoped to issue acceptance criteria.
   - Run relevant checks/tests before opening PR.
5. **Open PR**
   - PR title mirrors issue title.
   - PR body must include:
     - Summary
     - Implementation notes
     - Testing notes
     - `Closes #<issueNumber>`
6. **Review**
   - Address review feedback and keep PR/Issue/project status aligned.
7. **Merge to `master`**
8. **Close issue**
   - Ensure issue is closed and project card is in `Done`.

## Issues, PRs, And Project Board

### Issues

- Use `.github/ISSUE_TEMPLATE/feature.yml`, `bug.yml`, or `chore.yml`.
- Each issue must include:
  - Problem/goal statement
  - Acceptance criteria as a markdown checklist
  - Optional links to relevant `.agents` skill files

### Pull Requests

- Use `.github/pull_request_template.md`.
- PR must reference the tracked issue and include test evidence.
- Keep commit and PR scope aligned to the issue acceptance criteria.

### Project Board Status Policy

- Issue created -> `Backlog`
- Branch created + active implementation -> `In Progress`
- PR opened -> `In Review`
- PR merged + issue closed -> `Done`

Recommended automation defaults:

- Auto-add new Issues and PRs to the project.
- Default new items to `Backlog`.
- Auto-mark closed items as `Done`.
- Optionally map labels like `in-progress` / `in-review` to board status.

## `.agents`-First Protocol

Before planning or coding:

1. Inspect matching skill docs under `.agents/skills/*/SKILL.md`.
2. Read linked `references/` or `rules/` files only as needed.
3. Apply those conventions during design, implementation, and review.
4. For web database / Neon work, also check:
   `apps/web/.agents/skills/neon-postgres/SKILL.md`.

If no skill clearly matches, use closest domain guidance and note assumptions.

## Domain Chronicle (Current Repo)

| Domain                                      | Skills                                                                                                                            | Paths                                                                                                                                                                                                        | Use When                                                                                                    |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Code quality and tooling                    | `ultracite`, `firecrawl`, `find-skills`                                                                                           | `.agents/skills/ultracite`, `.agents/skills/firecrawl`, `.agents/skills/find-skills`                                                                                                                         | Lint/format standards, web research/scraping workflows, finding/installing additional skills                |
| Web/React/Next architecture and performance | `vercel-react-best-practices`, `vercel-composition-patterns`, `next-cache-components`, `frontend-design`, `web-design-guidelines` | `.agents/skills/vercel-react-best-practices`, `.agents/skills/vercel-composition-patterns`, `.agents/skills/next-cache-components`, `.agents/skills/frontend-design`, `.agents/skills/web-design-guidelines` | Next.js/React performance, component API design, cache components, UI implementation, UI compliance reviews |
| Native/Expo/mobile                          | `building-native-ui`, `native-data-fetching`, `vercel-react-native-skills`                                                        | `.agents/skills/building-native-ui`, `.agents/skills/native-data-fetching`, `.agents/skills/vercel-react-native-skills`                                                                                      | Expo Router UI, network/data-fetching patterns for native, React Native performance and platform rules      |
| SEO and marketing content                   | `seo-audit`, `programmatic-seo`, `copywriting`                                                                                    | `.agents/skills/seo-audit`, `.agents/skills/programmatic-seo`, `.agents/skills/copywriting`                                                                                                                  | SEO diagnostics, SEO-at-scale page systems, conversion-focused page copy                                    |
| App-local data platform                     | `neon-postgres`                                                                                                                   | `apps/web/.agents/skills/neon-postgres`                                                                                                                                                                      | Neon connection patterns, branching, APIs/SDKs, and Drizzle/Neon integration tasks in web app scope         |

Cross-reference notes:

- Ultracite standards are maintained in:
  `.agents/skills/ultracite/SKILL.md` and
  `.agents/skills/ultracite/references/code-standards.md`.
- Firecrawl operational and safety details are in:
  `.agents/skills/firecrawl/rules/install.md` and
  `.agents/skills/firecrawl/rules/security.md`.

## Quality Gates

Use these as defaults unless a narrower command is more appropriate:

- Lint/format checks: `pnpm dlx ultracite check`
- Auto-fix: `pnpm dlx ultracite fix`
- Web tests: `pnpm web:test`
- Web E2E: `pnpm web:test:e2e`
- Type checks (workspace): `pnpm check-types`

## Maintenance Rule

When workflow or skill structure changes, update all of:

- `AGENTS.md`
- `copilot-instructions.md`
- `.github/copilot-instructions.md`
- `.github/ISSUE_TEMPLATE/*`
- `.github/pull_request_template.md`

Do not let these files drift from actual repo structure and operating practice.
