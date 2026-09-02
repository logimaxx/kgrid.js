# KGrid — AI integration guide

Use this document when implementing or modifying **@logimaxx/kgrid** in a host application. It is optimized for AI assistants: facts, constraints, and patterns that prevent common mistakes.

Human-readable references: [README](../README.md), [configuration.md](configuration.md), [api.md](api.md), [integration.md](integration.md), [field-types.md](field-types.md), [table-shell.md](table-shell.md).

---

## What KGrid is

- **Declarative JSON table** on top of **KViews** (JSON:API collections, Handlebars row templates).
- **jQuery** DOM; global entry point `window.KGrid` (IIFE bundle `dist/kgrid.js`).
- Features: filter, sort, paging, inline create/update/delete, view/edit interaction modes.
- **Does not** fetch data by itself beyond wiring KViews URLs — CRUD goes through `grid.instance` (KViews collection).

---

## Hard requirements

| Requirement | Notes |
|-------------|--------|
| jQuery `>= 3.7.0` | Peer dependency |
| `@logimaxx/kviews` | Peer; must expose `createCollectionInstance` |
| `styles/table.css` | **Required** — view/edit modes, row-actions collapse / compact width, cell visibility |
| Load order | jQuery → KViews → `kgrid.js` → (optional `kgrid-widgets.js`) → `configure({ customInputTypes })` → `init()` |
| Bootstrap + Font Awesome | Recommended (default template uses `btn-*`, `fa-sort-*`) |

Without `table.css`, row-actions width, view/edit toggling, and inline edit display break.

---

## Minimal integration (copy pattern)

```html
<link rel="stylesheet" href="node_modules/@logimaxx/kgrid/styles/table.css">
<script src="jquery.min.js"></script>
<script src="node_modules/@logimaxx/kviews/dist/kviews.min.js"></script>
<script src="node_modules/@logimaxx/kgrid/dist/kgrid.js"></script>
<div id="grid-host"></div>
```

```javascript
KGrid.configure({
  onError: function (err) { console.error(err); },
  deleteConfirm: function (ctx, ok, cancel) {
    if (confirm("Delete?")) ok(); else if (cancel) cancel();
  },
  // customInputTypes: { select2: KGrid.select2(fn), autosuggest: KGrid.autosuggest(fn) }
});

const grid = await KGrid.init(document.getElementById("grid-host"), {
  url: "/api/products",
  updateUrl: "/api/products",
  deleteUrl: "/api/products",
  insertUrl: "/api/products",
  type: "products",
  defaultInteraction: "view",
  features: {
    filtering: true,
    sorting: true,
    paging: true,
    create: true,
    update: true,
    delete: true,
    columnChooser: true,
  },
  storageKey: "catalog.products",
  filterStorageScope: companyId,
  columns: [/* see column shape below */],
});

// grid.instance — KViews collection
// grid.filterForm.filter(name, value, operator)
// grid.setInteraction("edit" | "view")
// grid.getInteraction()
```

---

## `KGrid.configure()` hooks (call once before any `init`)

| Hook | When to override |
|------|------------------|
| `kviews` | ES modules / no `window.KViews` |
| `onError` | Always in production apps |
| `deleteConfirm(context, onConfirm, onCancel)` | Row delete UI (preferred over hardcoded messages) |
| `confirm(message, onConfirm, onCancel)` | Generic dialogs; default delete flow uses this if `deleteConfirm` unset |
| `serializeForm(form, columns?)` | Override only for non-flat APIs. Default already emits checkbox flags as `"1"` / `"0"`. |
| `customInputTypes` | Map of type name → plugin (`KGrid.select2(fn)`, `KGrid.inputType(…)`, or `{ create, … }`) |

Per-table override: pass `deleteConfirm` in `init(host, { deleteConfirm, ... })`.

`deleteConfirm` context: `{ item, view, options }`. Call `onConfirm()` to run `item.delete()`; `onCancel()` to clear `confirm-delete` styling.

---

## Table options (essential)

**Data:** exactly one of:

- Remote: `url` (+ optional `updateUrl`, `deleteUrl`, `insertUrl`) + `type` (JSON:API resource type)
- Local: `data: [{ id, name, ... }]` (plain objects; KGrid wraps as `{ attributes }`)

**Features** (all default `false`):

```javascript
features: { filtering, sorting, paging, create, update, delete, columnChooser }
```

**Interaction:**

- `defaultInteraction: "view" | "edit"` (prefer over deprecated `editmode`)
- `grid.setInteraction("edit", { create, update, delete })` — optional per-feature overrides via `data-allow-*` on `.custom-table-shell`

**Shell / empty state:**

- `emptyRowMessage`, `pagingPageSizes`, `pagingDefaultSize`, `pagingFooterLabel`
- `noDataTemplate` — HTML for empty tbody (often `colspan` large, e.g. `99`)

**Insert row:** `insertFormRow: { position: "top" | "bottom" }`, `onNewItemCreated(data)`, `onInsertRowReady(form, row)`

**Row lifecycle:** `onRowFields(item, view, table)` — called after each data row’s `afterrender` / field mount (per-row enable/disable, show/hide).

---

## Column shape (minimal)

Each column in `columns: []` is normalized via `KGrid.normalizeColumnConfig` (proto merge + shortcuts):

```javascript
{
  name: "sku",           // required for filter/sort/update
  label: "SKU",
  hidden: false,         // schema: omit from UI entirely
  locked: false,         // column chooser cannot hide this field
  class: "col-sku",      // CSS on th/td (alias: columnClass); also sets data-name
  features: { create, update, filter, sort },  // per-column flags
  // Shared insert+update defaults (explicit insert/update win):
  // input: { type: "number", required: true },
  display: {
    template: "{{sku}}",  // Handlebars; keep simple {{field}}
    events: [             // optional; defaults to []
      { selector: ".x", event: "click", callback: "onSkuClick" }
    ],
  },
  filter: {
    type: "text",
    operator: "~=~",
    default: null,       // initial value
    persist: false,      // keep across filter reset (also implied by hidden / type hidden)
  },
  insert: { type: "text", required: true },  // events optional
  update: { type: "text" },
}
```

**Event callbacks:** string names resolve from `handlers: { onSkuClick: fn }` or `functions` on table options. Insert/update **must** resolve to functions or `init` throws. Display events: missing handler leaves string (runtime error on click).

**Hidden / persist filters:** columns with `hidden: true` or `filter.type: "hidden"` get a hidden form field (no filter-row cell). `filter.persist` (or hidden) re-applies `filter.default` on form reset.

**User column layout + filter reload:** `storageKey` persists layout (all companies) and filter values (`filterStorageScope` suffixes filters, e.g. company id) to `localStorage`. `features.columnChooser` adds a Columns panel (reorder + hide). Schema `hidden` columns stay out of the chooser. `locked: true` columns cannot be hidden. User-hidden columns collapse in the table but keep filter/insert/update inputs. `grid.getLayout()` / `setLayout()` / `resetLayout()`.

---

## Row actions column (do not break)

When `features.delete || features.update || features.create || features.clone`:

- Trailing column: `.kgrid-row-actions` on `th`/`td`
- `<colgroup>` with `col.kgrid-row-actions-col` (synced at init)
- **View mode:** column collapsed — full width for data columns
- **Edit mode:** column visible (~100px) — delete, save/cancel; insert row submit in `.new-record-row`

Rule: `KGrid.hasActionColumn(options)` — use the same logic if extending DOM; do not add action `<th>` only in header or only in body.

---

## DOM contract (if customizing HTML)

Host: empty `<div>` or div containing `table.custom-table`. KGrid adds `.custom-table-shell` on the interaction host.

Required regions inside `table.custom-table`:

| Selector | Purpose |
|----------|---------|
| `.thead-labels` | Column headers (one `<th>` template cloned) |
| `.thead-filters` | Filter row |
| `.before-main-tbody` / `.after-main-tbody` | Insert row top/bottom |
| `.main-tbody` | KViews data rows |
| `.no-data-tbody` | Empty state |
| `.paging-footer` | Removed if `features.paging` false |

Template placeholders: `{{EMPTY_ROW_MESSAGE}}`, `{{PAGE_SIZE_OPTIONS}}`, `{{PAGES_DATA_PAGESIZE}}`, `{{PAGING_FOOTER_LABEL}}` — see `KGrid.TABLE_SHELL_TEMPLATE` / [table-shell.md](table-shell.md).

**Forms:** Row/filter inputs cannot sit inside `<tr><form>`. KGrid uses hidden `<form>` + `form="id"` on controls. Do not remove this pattern.

---

## `init` return value

```javascript
const grid = await KGrid.init(host, opts);
grid.$host          // jQuery
grid.instance       // KViews collection — loadFromRemote, newItem, item.update/delete
grid.filterForm     // .filter(name, value, op), .reset()
grid.find(sel)      // search under $host
grid.setInteraction(mode, overrides?)
grid.getInteraction() // "view" | "edit"
grid.getLayout() / setLayout() / resetLayout()
```

Deprecated: `setEditMode`, `toggleEditMode` — use `setInteraction`.

---

## Common tasks

| Task | Approach |
|------|----------|
| Toggle edit UI | `grid.setInteraction("edit")` / `"view"` |
| Column chooser | `features.columnChooser` + `storageKey` |
| Persist filters on reload | `storageKey` (+ optional `filterStorageScope`) |
| Programmatic filter | `grid.filterForm.filter("name", "x", "~=~")` |
| Reload data | `grid.instance.loadFromRemote()` |
| Custom delete modal | `KGrid.configure({ deleteConfirm })` |
| Custom field widget | `KGrid.registerFieldType("myType", { create({ mode, col, config }) { return { $input }; } })` |
| Pass KViews from bundle | `KGrid.configure({ kviews: KViews })` or `init(host, { kviews: KViews })` |
| Empty host | Default — KGrid builds table from template |
| Existing table in host | `init` detects `table` and skips shell generation; colgroup still synced |

---

## Mistakes to avoid (AI checklist)

1. **Omitting `table.css`** — broken layout and interaction modes.
2. **Initializing before `configure`** — `customInputTypes` / deleteConfirm not set when needed.
3. **No KViews** — `init` throws `KVIEWS_MISSING_MSG`; set `configure({ kviews })` or `window.KViews`.
4. **Both `url` and `data` missing** — `init` throws.
5. **Column with `features.filter` but no `name`** — throws at setup.
6. **Mismatched action column** — different conditions for header vs body (always use `hasActionColumn`).
7. **Expecting action buttons in view mode** — row-actions column is collapsed; switch to edit or use `defaultInteraction: "edit"`.
8. **Column `type` not in `customInputTypes`** — field type not registered; mount/create fails or falls back to native handling.
9. **Display event handler string without `handlers` map** — fails at runtime on click.
10. **Editing `dist/kgrid.js` in node_modules** — change `src/` in the package or fork; rebuild with `npm run build`.
11. **Assuming cancel edit reloads local `data`** — cancel button calls `loadFromRemote()`; local-only grids need a custom approach.
12. **Breaking class names** — `custom-table-shell`, `data-interaction`, `main-tbody`, `kgrid-row-actions` are required by CSS and KViews wiring.

---

## Package layout (npm)

```
@logimaxx/kgrid/
  dist/kgrid.js          # main bundle
  dist/kgrid.min.js
  styles/table.css       # required stylesheet
  src/                   # source modules (concatenated in build)
  docs/                  # human + this AI guide
  integrations/          # host examples (e.g. maxxops)
```

Peers: `jquery`, `@logimaxx/kviews`.

---

## In a consumer repo (for Cursor / Copilot / etc.)

Add to the project’s `AGENTS.md` or rules:

```markdown
When working with KGrid tables, read:
node_modules/@logimaxx/kgrid/docs/ai-guide.md
(or the copy in docs/kgrid-ai-guide.md if vendored)
```

Run demo locally: `npm run demo` in the kgrid package → `http://localhost:5173/demo/`.

---

## Version

This guide matches **@logimaxx/kgrid@0.4.0** (column chooser, persisted layout/filters, row lifecycle hooks, `column.class`, persist filters, `input` shorthand). If APIs differ in another version, prefer `docs/api.md` in the installed package.
