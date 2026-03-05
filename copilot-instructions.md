# Copilot Implementation Guide (Dead Party Media)

This guide is for Copilot-style coding assistants working in this repository.
Follow it with `AGENTS.md` as the governing workflow contract.

## Start Here (Mandatory)

Before planning or generating code:

1. Read `AGENTS.md`.
2. Read the relevant skill docs in `.agents/skills/*/SKILL.md`.
3. If task touches web DB/Neon behavior, also read:
   `apps/web/.agents/skills/neon-postgres/SKILL.md`.

Do not skip `.agents` discovery and jump directly to implementation.

## GitHub Workflow Requirements

Use GitHub as the work-tracking layer for status and delivery:

1. Plan work.
2. Create or reference an Issue (`Feature`, `Bug`, `Chore`).
3. Create a branch from `master`.
4. Implement and test.
5. Open PR.
6. Review.
7. Merge to `master`.
8. Close issue.

### Issue Rules

- Use the issue forms in `.github/ISSUE_TEMPLATE/`.
- Titles must start with:
  - `feat: ...`
  - `fix: ...`
  - `chore: ...`
- Include acceptance criteria as a checklist.
- Add optional links to relevant `.agents` files when useful.

### Branch Rules

- `feat/<slug>-<issueNumber>`
- `fix/<slug>-<issueNumber>`
- `chore/<slug>-<issueNumber>`

Examples:

- `feat/article-share-card-412`
- `fix/cart-session-timeout-389`
- `chore/update-playwright-fixtures-377`

### Pull Request Rules

- Title mirrors issue title.
- Body must include:
  - Summary
  - Implementation Notes
  - Testing Notes
  - `Closes #<issueNumber>`
- Use `.github/pull_request_template.md`.

## GitHub Project Board Rules

Project status must stay in sync with work state:

- Issue created -> `Backlog`
- Branch created/work started -> `In Progress`
- PR opened -> `In Review`
- PR merged + issue closed -> `Done`

Recommended automation:

- Auto-add new issues/PRs to project.
- Default to `Backlog`.
- Auto-mark `Done` on close/merge.
- Optional label mapping for `in-progress` and `in-review`.

## Task Routing To `.agents`

| Task Type                                          | Skills To Read First                                                                                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint, formatting, JS/TS code quality               | `.agents/skills/ultracite/SKILL.md`                                                                                                                           |
| React/Next performance and architecture            | `.agents/skills/vercel-react-best-practices/SKILL.md`, `.agents/skills/vercel-composition-patterns/SKILL.md`, `.agents/skills/next-cache-components/SKILL.md` |
| Web UI implementation or review                    | `.agents/skills/frontend-design/SKILL.md`, `.agents/skills/web-design-guidelines/SKILL.md`                                                                    |
| Expo/React Native UI and performance               | `.agents/skills/building-native-ui/SKILL.md`, `.agents/skills/vercel-react-native-skills/SKILL.md`                                                            |
| Network/data-fetching behavior (especially native) | `.agents/skills/native-data-fetching/SKILL.md`                                                                                                                |
| SEO work                                           | `.agents/skills/seo-audit/SKILL.md`, `.agents/skills/programmatic-seo/SKILL.md`                                                                               |
| Marketing copy                                     | `.agents/skills/copywriting/SKILL.md`                                                                                                                         |
| Web research/scraping                              | `.agents/skills/firecrawl/SKILL.md`                                                                                                                           |
| Neon/Postgres work in web app                      | `apps/web/.agents/skills/neon-postgres/SKILL.md`                                                                                                              |

## Quality And Testing Expectations

Use commands relevant to the changed scope:

- Lint/check: `pnpm dlx ultracite check`
- Fix formatting/lint: `pnpm dlx ultracite fix`
- Type checks: `pnpm check-types`
- Web unit/integration tests: `pnpm web:test`
- Web e2e tests: `pnpm web:test:e2e`

Include executed commands/results in PR testing notes.

## Alignment Rule

If `.agents` structure, workflow, or delivery conventions change, update:

- `AGENTS.md`
- `copilot-instructions.md`
- `.github/copilot-instructions.md`
- `.github/ISSUE_TEMPLATE/*`
- `.github/pull_request_template.md`
