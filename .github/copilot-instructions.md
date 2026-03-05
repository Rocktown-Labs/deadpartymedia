---
applyTo: "**/*"
---

# Copilot Implementation Guide (Dead Party Media)

This file mirrors the root-level `copilot-instructions.md` and must stay
aligned with `AGENTS.md`.

## Mandatory Startup Sequence

Before planning or coding:

1. Read `AGENTS.md`.
2. Read matching `.agents` skill docs:
   `.agents/skills/*/SKILL.md`.
3. If web DB/Neon behavior is in scope, read:
   `apps/web/.agents/skills/neon-postgres/SKILL.md`.

## Required GitHub Flow

Always execute work through:

`Plan -> Issue -> Branch -> Implement -> Test -> PR -> Review -> Merge to master -> Close Issue`

### Issue Rules

- Use `.github/ISSUE_TEMPLATE/{feature,bug,chore}.yml`.
- Titles must start with:
  - `feat: ...`
  - `fix: ...`
  - `chore: ...`
- Include acceptance criteria checklist.

### Branch Rules

- `feat/<slug>-<issueNumber>`
- `fix/<slug>-<issueNumber>`
- `chore/<slug>-<issueNumber>`

### PR Rules

- Title mirrors issue title.
- Use `.github/pull_request_template.md`.
- Include Summary, Implementation Notes, Testing Notes, and `Closes #<issueNumber>`.

## Project Board Policy

Keep project state synchronized:

- Issue created -> `Backlog`
- Branch created/work started -> `In Progress`
- PR opened -> `In Review`
- PR merged + issue closed -> `Done`

Recommended automation:

- Auto-add new issues/PRs to the board.
- Default to `Backlog`.
- Auto-mark `Done` on close/merge.
- Optional label-to-status mapping for `in-progress` and `in-review`.

## Task Routing

- Code quality/lint: `.agents/skills/ultracite/SKILL.md`
- React/Next architecture/perf:
  `.agents/skills/vercel-react-best-practices/SKILL.md`,
  `.agents/skills/vercel-composition-patterns/SKILL.md`,
  `.agents/skills/next-cache-components/SKILL.md`
- Web UI/design:
  `.agents/skills/frontend-design/SKILL.md`,
  `.agents/skills/web-design-guidelines/SKILL.md`
- Expo/React Native:
  `.agents/skills/building-native-ui/SKILL.md`,
  `.agents/skills/native-data-fetching/SKILL.md`,
  `.agents/skills/vercel-react-native-skills/SKILL.md`
- SEO/content:
  `.agents/skills/seo-audit/SKILL.md`,
  `.agents/skills/programmatic-seo/SKILL.md`,
  `.agents/skills/copywriting/SKILL.md`
- Research/scraping:
  `.agents/skills/firecrawl/SKILL.md`

## Quality Gates

- `pnpm dlx ultracite check`
- `pnpm check-types`
- `pnpm web:test` (when web scope is touched)
- `pnpm web:test:e2e` (when end-to-end behavior is touched)

Include test command evidence in PR testing notes.
