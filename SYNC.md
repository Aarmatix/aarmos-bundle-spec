# Sync policy: this spec repo ↔ Aarmos monorepo working copy

The canonical home of the **aarmos.bundle/1** schema is this repository.
A working copy lives inside the Aarmos product monorepo at
`packages/bundle-schema/` so the PWA, CLI, and bridge can iterate against
unreleased schema changes without a two-repo dance.

## Rules

1. **This repo is upstream.** Every change to `schemas/`, `src/`,
   `README.md`, or `package.json` must land here first (or in the
   same PR window as the monorepo change).
2. **npm publishes from this repo.** `npm publish` for
   `@aarmos/bundle-schema@X.Y.Z` is cut from a tagged commit here, never from
   the monorepo working copy.
3. **Version bumps are coordinated.** Bumping `version` in
   `package.json` is only allowed once the same bump has been pushed
   here and tagged.
4. **Third-party changes upstream first.** External contributors PR to
   this repo. Merged commits are mirrored into the monorepo working
   copy in the next monorepo change.
5. **Divergence audit.** Any release checklist for `@aarmos/bundle-schema`
   includes a diff between this repo and the monorepo working copy.
   A non-empty diff blocks the release.
