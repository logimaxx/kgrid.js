# KGrid

**KGrid** is a declarative data table (JSON configuration) built on [KViews](https://github.com/logimaxx/kviews.js). It supports filtering, sorting, paging, and inline create/update/delete.

> **Proprietary — Logimaxx System SRL.** This repository is not open source. Use, copy, and distribution require explicit permission. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).

Global entry point: `window.KGrid`

## Requirements (peer dependencies)

| Dependency | Required | Notes |
|------------|----------|--------|
| [jQuery](https://jquery.com/) | Yes | `>= 3.7.0` |
| [@logimaxx/kviews](https://github.com/logimaxx/kviews.js) | Yes | JSON:API collections, Handlebars templates |
| Handlebars | Yes (via KViews) | Display templates — use simple `{{field}}` syntax |
| Custom input types | Optional | `configure({ customInputTypes })` + optional `integrations/kgrid-widgets.js` |

## Installation

Access is limited to authorized Logimaxx projects (private registry, granted GitHub access, or local path).

```bash
# Private registry or scoped install (as configured by your organization)
npm install @logimaxx/kgrid @logimaxx/kviews jquery
```

Private Git dependency (requires repository access):

```bash
npm install github:logimaxx/kgrid#main
```

Local development:

```bash
npm install file:../kgrid
```

## Quick start

```html
<link rel="stylesheet" href="node_modules/@logimaxx/kgrid/styles/table.css">
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="node_modules/@logimaxx/kviews/dist/kviews.min.js"></script>
<script src="node_modules/@logimaxx/kgrid/dist/kgrid.js"></script>
<script src="your-app/kgrid-config.js"></script>

<div id="products-grid"></div>
<script>
  KGrid.init(document.getElementById("products-grid"), { url: "/api/products", /* ... */ });
</script>
```

KGrid **generates the table markup** from an HTML template (`KGrid.TABLE_SHELL_TEMPLATE` in `src/table-shell.js`). You provide an empty container, `styles/table.css`, and optionally Bootstrap + Font Awesome for paging/sort icons.

### Host configuration (`kgrid-config.js`)

Call `KGrid.configure()` **before** mounting any table:

```javascript
KGrid.configure({
  log: console.log.bind(console),
  onError: function (err) { console.error(err); },
  confirm: function (msg, ok, cancel) {
    if (confirm(msg)) ok(); else if (cancel) cancel();
  },
  deleteConfirm: function (context, ok, cancel) {
    if (confirm("Delete this row?")) ok(); else if (cancel) cancel();
  },
  // Optional: ES module apps
  // kviews: KViews,
  // customInputTypes: { select2: KGrid.select2(fn), … } — see docs/integration.md
});
```

KViews is resolved from `configure({ kviews })`, `window.KViews`, or `KGrid.init(host, { kviews, ... })`.

### Standalone init

```javascript
const grid = await KGrid.init(document.getElementById("table-host"), {
  url: "/api/products",
  type: "products",
  columns: [/* ... */],
});
// grid.instance, grid.setInteraction("edit"), grid.filterForm, …
```

## Documentation

| Guide | Description |
|-------|-------------|
| [AI integration guide](docs/ai-guide.md) | For Cursor/Copilot when using KGrid in other projects |
| [Configuration reference](docs/configuration.md) | Table options, columns, filters, features |
| [API reference](docs/api.md) | `KGrid` methods and grid instance API |
| [Integration guide](docs/integration.md) | `configure()`, KViews, plugins |
| [Field types](docs/field-types.md) | Native, built-in, plugins (select2, autosuggest, custom) |
| [Table shell template](docs/table-shell.md) | HTML template, placeholders, custom markup |

## API overview

| Symbol | Description |
|--------|-------------|
| `KGrid.configure(opts)` | Host hooks (`deleteConfirm`, `kviews`, `customInputTypes`, …) |
| `KGrid.init(host, opts)` | Empty host or existing `<table>`; returns grid API |
| `KGrid.TABLE_SHELL_TEMPLATE` | Default table HTML (editable) |
| `KGrid.hasActionColumn(opts)` | Whether a trailing row-actions column is rendered |
| `KGrid.registerFieldType(name, plugin)` | Custom filter/insert/update widgets |
| `grid.setInteraction('view' \| 'edit')` | View (data only, full width) or edit (inputs + action buttons) |
| `grid.instance` | KViews collection |
| `grid.filterForm` | Programmatic filters |

## Demo

In-memory JSON:API server + full CRUD UI:

```bash
npm install
npm run build
npm run demo    # → http://localhost:5173/demo/  (API: /api/products)
```

See [demo/README.md](demo/README.md).

## Build & test

```bash
npm run build   # → dist/kgrid.js, dist/kgrid.min.js
npm test        # vitest
```

## About Logimaxx

| | |
|---|---|
| **Product** | KGrid (`@logimaxx/kgrid`) — proprietary |
| **Company** | [Logimaxx System SRL](https://logimaxx.ro) |
| **Author** | Sergiu Voicu — [sergiu@logimaxx.ro](mailto:sergiu@logimaxx.ro) |
| **Stack** | Works with open-source [KViews](https://github.com/logimaxx/kviews.js) |

Full notice and contact details: [NOTICE.md](NOTICE.md).

## License

Proprietary. Copyright © Logimaxx System SRL. All rights reserved. See [LICENSE](LICENSE).

| Document | Purpose |
|----------|---------|
| [NOTICE.md](NOTICE.md) | Company, author, contact |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Internal contribution guidelines |
| [SECURITY.md](SECURITY.md) | Vulnerability reporting |
