# Source status for nexus-speed-dial

Audit baseline: 2026-10-06 UTC. The default branch at that point contained only starter/configuration files. Additional collaboration documentation does not make it a working implementation.

The following branches contain source trees and need integration/acceptance review. They are candidates, not an approved canonical release. Commit counts do not establish product quality, approval or freshness. Counts below compare to the pre-audit default branch; later metadata commits change that comparison.

| Source candidate | Examined commit | Commits ahead / behind at audit | Source-tree entries |
| --- | --- | --- | --- |
| [arena/01a0a900-nexus-speed-dial-v2](https://github.com/loftfull/nexus-speed-dial/tree/arena/01a0a900-nexus-speed-dial-v2) | `a1e1d973326c85c070d25e2ce7e28cf7d5186278` | 562 / 1 | 158 |
| [claude/project-analysis-development-7hkbna](https://github.com/loftfull/nexus-speed-dial/tree/claude/project-analysis-development-7hkbna) | `f5c0f2f823cac2d935296cf2a5f062e38f2b4b25` | 511 / 0 | 155 |

## Next integration gate (priority:P1)

1. Recover the owner-approved plan, product boundary and source branch from its existing instructions.
2. Check its CI, acceptance scenarios, deployment references, migrations and independent review requirements.
3. Integrate through a reviewable PR with exact source commits and a rollback plan. Resolve conflicts without discarding history.
4. Move the accepted implementation into the canonical branch only after the project gates pass.

Do not recreate the application from this starter branch while ignoring the existing implementation. Do not delete runtime, release or evidence branches because they are absent from this table.
