# Release guide

Maintainer-only process for shipping **`@logimaxx/kgrid`**. The package is proprietary (Logimaxx System SRL); distribution is controlled, but `publishConfig.access` is `public` so authorized npm publishes succeed.

Related: [CONTRIBUTING.md](../CONTRIBUTING.md), [NOTICE.md](../NOTICE.md), `scripts/release.mjs`, `version.sh`.

---

## Who can release

Only maintainers with:

- Write access to `github.com/logimaxx/kgrid`
- npm publish rights for the `@logimaxx` scope
- Permission to push tags to the default branch

Contact: [sergiu@logimaxx.ro](mailto:sergiu@logimaxx.ro).

---

## Prerequisites

1. Clean working tree for everything you intend to ship (except intentional `dist/` refresh — see below).
2. On the release branch (usually `main`), up to date with remote.
3. Logged in to npm as a user that can publish `@logimaxx/kgrid`:

```bash
npm whoami
npm access list packages @logimaxx   # or your org’s equivalent check
```

4. Do **not** set `"private": true` in `package.json`. That causes `npm publish` to fail with `EPRIVATE`. Access control is via registry permissions and who you grant installs to — not the `private` flag.

---

## Versioning

Use [semver](https://semver.org/):

| Bump | When |
|------|------|
| **patch** | Bug fixes, docs-only package tweaks, no API shape change |
| **minor** | New features / options that stay backward compatible |
| **major** | Breaking API, required config changes, or peer-dep jumps that break hosts |

Current version lives in `package.json` (`version`). `npm version` / `./version.sh` bump it and create a matching git tag (`vX.Y.Z`).

---

## What gets published

From `package.json` `files`:

| Path | Role |
|------|------|
| `dist/` | Bundles (`kgrid.js`, `kgrid.min.js`) — **commit these** before tagging |
| `src/` | Source |
| `styles/` | Required CSS (`table.css`) |
| `docs/` | Human + AI docs |
| `integrations/` | Optional widgets (e.g. `kgrid-widgets.js`) |
| `LICENSE`, `NOTICE.md`, `AGENTS.md` | Legal / branding |

`prepare` runs `npm run build` on install; still treat committed `dist/` as the release artifact so git-tag consumers get a ready tree.

---

## Release checklist

### 1. Finish the change set

- [ ] Tests cover non-trivial logic (`test/`)
- [ ] Docs under `docs/` updated if public API or behavior changed
- [ ] Peer deps (`jquery`, `@logimaxx/kviews`) still accurate
- [ ] Demo smoke-check if UI/CRUD changed: `npm run demo`

### 2. Prep (test + build)

```bash
npm run release
```

This runs `npm test` and `npm run build`, then reports whether `dist/` differs from the index.

If `dist/` is dirty:

```bash
git add dist
git commit -m "chore: refresh dist"
```

`npm version` requires a clean tree for the files it touches; commit dist (and any other release files) first.

### 3. Bump, tag, push

Preferred (Unix):

```bash
./version.sh patch   # or: minor | major
```

That runs:

1. `npm version <bump>` — updates `package.json` (+ lockfile if present), commits, tags
2. `git push`
3. `git push --tags`

Manual equivalent:

```bash
npm version patch    # or minor | major
git push && git push --tags
```

### 4. Publish to npm

```bash
npm publish
```

Scoped package name: `@logimaxx/kgrid`. Confirm the published version on the registry before notifying consumers.

### 5. After publish

- [ ] Spot-check install in a host app (or MaxxOps alias — see below)
- [ ] Note the version in release chat / ticket if the team uses one
- [ ] If hosts pin ranges (`^0.2.2`), confirm they can resolve the new version

---

## Consumer install

```bash
npm install @logimaxx/kgrid @logimaxx/kviews jquery
```

MaxxOps-style folder alias (keeps `node_modules/kgrid/`):

```bash
npm install kgrid@npm:@logimaxx/kgrid@^0.2.2
```

Alternatives (authorized access required):

```bash
npm install github:logimaxx/kgrid#v0.2.4   # or #main
npm install file:../kgrid
```

---

## One-liner flow (happy path)

```bash
# on main, changes already merged and reviewed
npm run release
# if dist dirty: commit as above, then:
./version.sh patch
npm publish
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `npm version` refuses (dirty tree) | Commit or stash; especially commit refreshed `dist/` |
| `EPRIVATE` on publish | Remove `"private": true`; keep `publishConfig.access: "public"` |
| `ENEEDAUTH` / 403 | `npm login` with a user that can publish `@logimaxx` |
| Tag already exists | Do not force-retag casually; bump again or delete the mistaken local tag only if it was never pushed |
| Consumers still on old code | They may pin exact versions or use a stale lockfile — bump their dependency range / reinstall |

---

## Do not

- Publish from a dirty or untested tree
- Skip committing `dist/` when the build changed bundles
- Force-push release tags on shared remotes without maintainer agreement
- Suggest open-sourcing or changing the license as part of a routine release
