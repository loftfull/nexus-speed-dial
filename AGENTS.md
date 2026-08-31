# Nexus Speed Dial — Codex Execution Contract

## Required workflow

This branch implements `docs/superpowers/plans/2026-08-31-nexus-speed-dial-milestone-1.md` against `docs/superpowers/specs/2026-08-31-nexus-speed-dial-design.md`.

Use the installed Superpowers workflow in this order:

1. `superpowers:using-git-worktrees`
2. `superpowers:subagent-driven-development`
3. For each implementation task, TDD first and a fresh implementer subagent.
4. After every task, run task-scoped spec-compliance and code-quality review.
5. At the end, run the full branch review and `superpowers:verification-before-completion`.
6. Do not merge or publish without explicit user approval.

## Binding product constraints

- Russian UI with correct Cyrillic typography.
- Restrained, realistic Glass Design only; no sci-fi/neon/excessive 3D.
- Site/service icons retain recognizable original colors.
- Calendar must never become a permanent layout column; it opens only as a popover from the date.
- Live tile settings must update both the main grid and preview through the same CSS-variable source of truth.
- Required tile modes: minimal, standard, expanded, large, list.
- Responsive desktop/tablet/mobile behavior is part of Milestone 1.
- A release cannot be reported complete while lint/type/unit/interaction/responsive/visual/reference QA fails.

## Branch

Work only on `codex/m1-glass-ui` for this milestone. Keep `English` clean.
