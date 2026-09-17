# Settings decomposition safety note

The current `SettingsPanel.tsx` is a large monolithic file with a one-line `DataSettings` implementation. A direct whole-file rewrite caused a parser regression while attempting to remove no-op controls.

Next settings work must first split the production settings shell from Data/Import/Browser Bridge behavior, preserving the existing validated implementation byte-for-byte where practical. Only then should dead controls be removed or replaced with real behavior. This is a safety constraint for Design-led Stabilization: no UX cleanup may risk working backup/import functionality.
