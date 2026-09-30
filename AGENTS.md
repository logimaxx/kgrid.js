# KGrid — notes for AI assistants

**Proprietary (Logimaxx System SRL, Sergiu Voicu).** Maintainer: sergiu@logimaxx.ro — https://logimaxx.ro. Do not suggest open-sourcing, public npm publish, or MIT licensing unless explicitly requested. Branding: [NOTICE.md](NOTICE.md).

**Consumers (MaxxOps, etc.):** never vendor a local tarball or `file:` path for `@logimaxx/kgrid`. Publish to npm, then bump the app to that version. Local `file:../kgrid` is for throwaway experiments only — not commits or Coolify deploys.

When changing this repository or integrating **@logimaxx/kgrid** in another app, read:

**[docs/ai-guide.md](docs/ai-guide.md)** — integration checklist, config shape, DOM/CSS contract, pitfalls.

Human docs: [README.md](README.md), [docs/](docs/).
