# Contributing to KGrid

KGrid is **proprietary** software owned by **Logimaxx System SRL** (author: Sergiu Voicu). Contributions are accepted only from people who are authorized to access this repository (employees, contractors, or partners under agreement).

## Before you start

1. Confirm you have permission to use and modify this code under [LICENSE](LICENSE).
2. Read [README.md](README.md) and [docs/ai-guide.md](docs/ai-guide.md) for architecture and integration rules.
3. Do not commit secrets, API keys, or customer-specific data.

## Development setup

```bash
npm install
npm run build
npm test
```

Optional local demo:

```bash
npm run demo   # http://localhost:5173/demo/
```

## Making changes

1. Create a branch from the default branch (`main` or as agreed by the team).
2. Keep changes focused; match existing style in `src/` (no unrelated refactors).
3. Update docs under `docs/` when behavior or public API changes.
4. Add or update tests in `test/` for non-trivial logic.
5. Run `npm test` and `npm run build` before opening a pull request.

## Pull requests

- Describe **what** changed and **why**.
- Link internal tickets or specs when applicable.
- Ensure CI passes (if configured).
- Request review from a maintainer with merge rights.

## What we expect in code

- **Host-agnostic API:** `KGrid.init(host, opts)` with a DOM host; no hard dependency on a specific app framework.
- **KViews:** resolve via `configure`, `init` options, or `window.KViews` — do not break peer dependency boundaries.
- **Minimal scope:** prefer small, readable diffs over new abstractions unless reuse is clear.

## Releases

Only maintainers cut versions.

```bash
npm run release          # test + build; commit dist/ if dirty
./version.sh patch       # or minor | major — bump + git push + tags
npm publish              # scoped public package (@logimaxx/kgrid)
```

`publishConfig.access` is `public`. Do not re-add `"private": true` or `npm publish` fails with `EPRIVATE`.

Consumers:

```bash
npm install @logimaxx/kgrid
# or alias folder as kgrid (MaxxOps script paths):
npm install kgrid@npm:@logimaxx/kgrid@^0.2.2
```

## Questions

Contact **Sergiu Voicu** ([sergiu@logimaxx.ro](mailto:sergiu@logimaxx.ro)) or your team’s internal channel. See [NOTICE.md](NOTICE.md).
