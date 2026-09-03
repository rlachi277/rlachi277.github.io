# AGENTS — Write Access Policy

Agent policy for this workspace:

- Allowed write directory: src/vibing/
  - All other directories are off-limits for automated agent write operations.
  - Building, which modifies the contents of the dist/ directory, is an exception to this rule. However, consider running `pnpm check:vibing`(ts typecheck) instead of `pnpm build:vibing` whenever possible.
  - When building, all TypeScript files under src/vibing/ will be compiled and the resulting JavaScript files will be copied to the respective path under dist/vibing/. All other files will be copied as-is to the respective path under dist/vibing/.
  - Any agent-created or agent-modified files outside `src/vibing/` will be reverted and reported to the repository owner.
- Do not, under any circumstances, read or use the contents of the db/ directory.
