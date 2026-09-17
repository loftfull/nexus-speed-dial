# GitHub Actions Node 24 maintenance

Nexus QA uses the application's Node 22 runtime, but the GitHub-hosted actions themselves should use current Node 24-based major releases to avoid runner deprecation warnings.

Validated upstream majors on 2026-09-17: `actions/checkout@v7`, `actions/setup-node@v7`, and `actions/upload-artifact@v7`. This maintenance change must not alter the application Node version or QA command sequence.
