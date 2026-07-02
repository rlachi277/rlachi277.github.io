# AGENTS — Write Access Policy

Agent write access policy for this workspace:

- Allowed write directory: src/vibing/
- All other directories are off-limits for automated agent write operations.
- When building, all TypeScript files inside src/vibing/ will be compiled and the resulting JavaScript files will be copied to the respective path inside dist/vibing/. All other files will be copied as-is to dist/vibing/.

- Any agent-created or agent-modified files outside `vibing/` will be reverted and reported to the repository owner.
