# Legacy branch migration notes

The active product branch is `arena/01a0a900-nexus-speed-dial`. The old `codex/m1-glass-ui` and `codex/m1-glass-ui-history-notes-temp` branches are references, not alternate application implementations to merge wholesale.

## Reusable decisions

| Legacy source | Decision for active Nexus |
| --- | --- |
| `e2e/app-shell.spec.ts`, `e2e/visual.spec.ts` | Reuse scenarios and visual QA ideas, adapting locators to the current shell. |
| `src/domain/backup.ts` | Reuse the versioned-envelope and validation approach. Do not copy its incompatible data model; current backup must preserve SiteRecord, Project, BrowserSession and UI settings. |
| `StorageAdapter` and storage tests | Reuse the adapter boundary when extracting persistence from UI components. Keep the existing local-first reducer as the source of truth. |
| `tileSettingsPanelModel` and `tilePresets` | Reuse pure-model testing and preset normalization. Keep current tile modes and appearance state. |
| `useLiveClock`, calendar models and weather service | Reuse pure date/weather testing ideas only; keep the current visual components. |
| mobile navigation and glass primitives | Reuse accessibility and focus behavior selectively; do not replace the current Library/Projects/Tags layout. |

## Explicit non-goals

- Do not replace `src/domain/appStore.ts` with the legacy store.
- Do not merge the legacy `AppShell`, CSS modules or seed data wholesale.
- Do not restore the old data model, which does not contain the current Library, Projects and BrowserSession context.
- Do not treat legacy screenshots as runtime assets.

## Migration order

1. Keep unit and browser-bridge security tests green.
2. Add E2E coverage for the current workflows: Library, Projects, sessions, import preview and screenshot tiles.
3. Extract backup/import orchestration from `SettingsPanel.tsx` into domain utilities and components.
4. Add versioned backup migration tests using the current data model.
5. Extract tile settings and storage usage models without changing behavior.
6. Add visual baselines only after the current DOM and responsive behavior are stable.

Every migrated behavior must be connected to a working control and verified with `npm run qa:unit`, `git diff --check`, and the relevant E2E or visual test.
