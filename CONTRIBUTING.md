# Contributing

## Changelog policy
- Every change updates `CHANGELOG.md` under the `[Unreleased]` section.
- If the change is not user-facing, add a bullet: "No user-facing changes."
- Keep entries short and action-oriented.

## Pull requests
- Confirm `CHANGELOG.md` is updated before requesting review.
- If you're using an AI coding agent, make sure it follows the changelog policy.

## Dependabot PRs

Dependabot opens automated dependency update PRs once a month. **Do not merge these manually.** Follow this workflow:

1. **When PRs arrive:** You'll get GitHub notifications for the new Dependabot PRs.
2. **Hand them to an agent:** Ask your LLM coding agent to "review and merge the open Dependabot PRs." The agent follows the review checklist in `AGENTS.md` — checking CI, reading release notes for high-risk deps, verifying the Dockerfile, etc.
3. **Agent merges safe PRs** and flags anything risky with an explanation.
4. **Post-merge commands** (the agent handles these, but good to know):
   - Prisma bump → `npx prisma generate`
   - Playwright bump → `npx playwright install` + update Playwright base image tag in `Dockerfile`
5. **If the agent flags a concern:** Review the agent's comment, decide whether to proceed or skip that update.
6. **Lockfile conflicts:** If grouped PRs cause merge conflicts on later PRs, comment `@dependabot rebase` on the conflicting PR.

### What you'll see each month
- **Grouped PRs** — one per ecosystem (backend, frontend, GitHub Actions) batching minor/patch bumps for low-risk deps. These are usually quick approvals.
- **Individual PRs** — one per high-risk dep (Prisma, Playwright, Anthropic SDK, OGL). These get extra scrutiny.
- **Major version bumps are suppressed** — Dependabot won't open PRs for these. Handle major upgrades manually on dedicated branches when you're ready.