# Configuration reference

KGrid tables are driven by a JSON **options** object passed to `KGrid.init(host, opts)`. The host is a DOM element or jQuery object (empty, or already containing a `<table class="custom-table">`).

Table-level options are merged with `KGrid.protoOptions`. Each entry in `columns` is deep-merged with `KGrid.protoColumnConfig` via `KGrid.setDefaultValues`.

**You must pass a `columns` array.** KGrid does not infer columns from your API or local `data` — every field needs an explicit column definition. View text defaults to `{{attribute_name}}` per column; configure `filter`, `insert`, and `update` when those features are enabled.

---

## Complete example

Typical remote JSON:API table with filter, sort, paging, and CRUD. This is the shape to aim for; the sections below explain each part.

```javascript
await KGrid.init(document.getElementById("grid-host"), {
  // --- data source (remote) ---
  url: "/api/products",
  updateUrl: "/api/products",
  deleteUrl: "/api/products",
  insertUrl: "/api/products",
  type: "products",

  // --- table features (all default false) ---
  defaultInteraction: "view",
  features: {
    filtering: true,
    sorting: true,
    paging: true,
    create: true,
    update: true,
    delete: true,
  },
  insertFormRow: { position: "top" },
  noDataTemplate: "<td colspan='99'>No records match your filters.</td>",

  // --- columns: required; one object per field ---
  columns: [
    {
      name: "id",
      label: "ID",
      hidden: true,
      insert: { type: "hidden", events: [] },
      update: { type: "hidden", events: [] },
    },
    {
      name: "name",
      label: "Name",
      features: { sort: true, filter: true, create: true, update: true },
      // use template to output custom HTML otherwise it will default to  {{name}}
      display: { template: "<strong>{{name}}</strong>"}, 
      filter: { type: "text", operator: "~=~" },
      insert: { type: "text", required: true, events: [] },
      update: { type: "text", events: [] },
    },
    {
      name: "category",
      label: "Category",
      features: { filter: true, create: true, update: true },
      filter: {
        type: "select",
        operator: "=",
        options: [
          { label: "All", value: "" },
          { label: "Hardware", value: "hardware" },
        ],
      },
      insert: {
        type: "select",
        options: [{ label: "Hardware", value: "hardware" }],
        events: [],
      },
      update: {
        type: "select",
        options: [{ label: "Hardware", value: "hardware" }],
        events: [],
      },
    },
  ],
});
```

Local data only — omit URLs and pass rows as plain objects:

```javascript
await KGrid.init(host, {
  data: [{ id: 1, name: "Alpha", category: "hardware" }],
  features: { filtering: true, sorting: true },
  columns: [/* same column shape as above */],
});
```

---

## How the example fits together

| Block | Role |
|-------|------|
| `url` + `type` | Load JSON:API collection via KViews (`updateUrl` / `deleteUrl` / `insertUrl` for per-item CRUD) |
| `data` | Alternative to `url` — local array, no remote load |
| `features` | Turn on filter row, sortable headers, paging footer, insert row, inline edit, row delete |
| `defaultInteraction` | `"view"` (read-only cells) or `"edit"` (inputs + row-actions column) |
| `columns` | **Required** — defines every field the table knows about |

### Column checklist

For **each** column object:

1. Set `name` (required when that column uses sort, filter, create, or update).
2. Set `label` (header text).
3. Set column `features`: which of `sort`, `filter`, `create`, `update` apply to this field.
4. Configure the **field blocks** that match those features:

| When enabled | Configure | Purpose |
|--------------|-----------|---------|
| View mode (optional) | `display` | Custom Handlebars HTML or click handlers; omit for `{{name}}` |
| `features.filter` + table `features.filtering` | `filter` | Filter control in header (`type`, `operator`, `options` for selects) |
| `features.create` + table `features.create` | `insert` | Control in the new-record row (`type`, `required`, `options`, …) |
| `features.update` + table `features.update` | `update` | Inline edit control in data rows |

Proto defaults fill gaps: view cells use `{{name}}` when `display` is omitted; `insert`/`update` default to `type: "text"`. **Select-like types need `options`**, pluggable types need `KGrid.configure()` hooks, and **`events` must be an array** on `insert` and `update` when you define those blocks (use `events: []` when you have no handlers).

Table `features.*` gates whole UI regions; column `features.*` gates controls inside those regions. Example: `features.filtering: true` on the table plus `features.filter: true` on a column plus a `filter: { type: "text", … }` block produces a filter input for that column.

---

## Table options

### Data source

Provide **either** a remote URL **or** a local array:

| Option | Type | Description |
|--------|------|-------------|
| `url` | `string` | Primary collection URL (load/list) |
| `deleteUrl` | `string` | Delete endpoint (per-item: `url/id`) |
| `updateUrl` | `string` | Update endpoint (per-item: `url/id`) |
| `insertUrl` | `string` | Insert endpoint (collection URL) |
| `data` | `array` | Local rows as plain objects (no `url`) |
| `type` | `string` | JSON:API resource type (e.g. `products`) — passed to KViews |
| `kviews` | `object` | Optional KViews override for this table only |

`init` throws if both `url` and `data` are missing.

### Features

All default to `false`:

```javascript
features: {
  filtering: false,
  sorting: false,
  paging: false,
  create: false,
  update: false,
  delete: false,
  clone: false,
  columnChooser: false,
}
```

### Column chooser and persisted preferences

| Option | Type | Description |
|--------|------|-------------|
| `storageKey` | `string` | Persist layout (order + user-hidden) and filter values. Layout key: `kgrid:{storageKey}:layout`. Filters: `kgrid:{storageKey}:filters` plus optional scope. |
| `filterStorageScope` | `string` | Suffix for saved filters only (e.g. company id). Layout is shared across scopes. |
| `features.columnChooser` | `boolean` | Columns panel (checkbox + drag). Works without `storageKey` (session only). |
| `columnChooserLabel` | `string` | Button label (default `"Columns"`) |
| `columnChooserResetLabel` | `string` | Reset button (default `"Reset columns"`) |
| `preferencesStorage` | `{ get, set }` | Per-table override of `configure({ preferencesStorage })`; default `localStorage` |

Column flags:

| Field | Meaning |
|-------|---------|
| `hidden: true` | Schema — omitted from UI and chooser (e.g. internal `id`) |
| `locked: true` | Visible; chooser cannot hide it (still reorderable). Use on required list fields such as name. |
| `userHidden` | Runtime only — set via chooser / `setLayout` |

User-hidden columns use `visibility: collapse` so insert/update/filter controls stay in the DOM. Filter values on hidden columns remain until Reset.

`filter.persist` still means “keep `filter.default` on form reset” — it is not reload persistence. Reload persistence is `storageKey`.

### Row actions column

When any of `create`, `update`, `delete`, or `clone` is enabled, KGrid adds a trailing column for row controls (clone, delete, save/cancel, insert submit). The same rule is used everywhere so header, filter row, data rows, and `colspan` stay aligned:

```javascript
KGrid.hasActionColumn(options)
// true when features.delete || features.update || features.create || features.clone
```

| Markup | Role |
|--------|------|
| `th` / `td.kgrid-row-actions` | Header, filters, data rows |
| `colgroup col.kgrid-row-actions-col` | Width control for `table-layout: fixed` (added at init via `syncActionColumnColgroup`) |

**View vs edit:** In **view** mode (`data-interaction="view"`), the row-actions column is collapsed (`visibility: collapse`, zero width) so data columns use the full table width. In **edit** mode, the column uses a compact width from `KGrid.actionColumnWidth(options)` (based on how many buttons can show) with clone / delete / save / cancel buttons and the insert-row submit cell.

`features.clone` (default `false`) adds a clone button. Host must supply `onClone(item, view, event)` — a function, or a string name resolved from `handlers` / `functions` (same as column event callbacks). KGrid does not clone records itself.

The new-record row (`.new-record-row`) uses the same `kgrid-row-actions` class on its submit cell; the whole insert row is hidden in view mode via existing CSS.

Override delete UX per table: `deleteConfirm` (see below and [integration.md](integration.md#deleteconfirm-row-delete)).

### Interaction mode

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultInteraction` | `'view' \| 'edit'` | `'view'` | Initial UI mode |
| `editmode` | `boolean` | — | **Deprecated.** Use `defaultInteraction` |

CSS on `.custom-table-shell`: `data-interaction="view|edit"`. Optional overrides: `k.setInteraction('edit', { create, update, delete })`.

### Insert row

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `insertFormRow.position` | `'top' \| 'bottom'` | `'top'` | New-record row position |
| `onNewItemCreated` | `function(data)` | — | After successful insert |
| `onInsertRowReady` | `function(form, row)` | — | After insert row DOM is built |
| `onRowFields` | `function(item, view, table)` | — | After each data row render / field mount |
| `deleteConfirm` | `(context, onConfirm, onCancel?) => void` | — | Row delete UX for this table; overrides `KGrid.configure({ deleteConfirm })` |

`deleteConfirm` receives `{ item, view, options }`. Call `onConfirm()` to delete; `onCancel()` to dismiss. See [integration.md](integration.md#deleteconfirm-row-delete).

### Presentation

| Option | Type | Description |
|--------|------|-------------|
| `noDataTemplate` | `string` (HTML) | Empty-state row in `.no-data-tbody` |
| `tableAttrs` | `object` | Attributes on `<table>` |
| `labelsRowAttrs` | `object` | Label header row |
| `dataRowAttrs` | `object` | Data `<tr>` template |
| `filtersRowAttrs` | `object` | Filter row |
| `pagingFooterAttrs` | `object` | Paging `<tfoot>` |
| `setAttrAsId` | `boolean` | Passed to KViews |

### Event handlers map

Column events may reference callbacks by **name**:

```javascript
{
  handlers: { onNameClick: function (e, item, view) { /* ... */ } },
  columns: [{
    name: "name",
    display: {
      template: '<a href="#">{{name}}</a>',
      events: [{ selector: "a", event: "click", callback: "onNameClick" }],
    },
    insert: { type: "text", events: [] },
    update: { type: "text", events: [] },
  }],
}
```

Insert/update handlers must resolve to functions at `init` or initialization throws. Display handlers: a missing name leaves the string and fails at click time.

Also resolvable via `options.functions[callbackName]`.

---

## Column configuration

Each element of `columns: []`:

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Field name (**required** for sort, filter, create, update on that column) |
| `label` | `string` | Header text |
| `hidden` | `boolean` | Hide from UI; may still participate in forms (e.g. `id` as `hidden`). Not user-togglable. |
| `locked` | `boolean` | Column chooser cannot hide this column |
| `class` / `columnClass` | `string` | CSS class on label/filter/data/insert cells; sets `data-name` |
| `attrs` | `object` | HTML attributes on header/cells |
| `input` | `object` | Shared defaults for `insert` + `update` (explicit blocks win) |
| `features` | `object` | `create`, `update`, `filter`, `sort` per column (default all `false`) |

### Display (`display`)

**Optional.** If you omit `display`, view-mode cells render `{{name}}` using the column’s `name`.

Set `display` only when you need custom markup or DOM events:

| Field | Type | Description |
|-------|------|-------------|
| `template` | `string` | Handlebars HTML; defaults to `{{name}}` when omitted |
| `events` | `array` | `{ selector, event, callback }`; defaults to `[]` from proto |

Use simple `{{field}}` in templates. KGrid does not ship Handlebars helpers (`eq`, `#if` on arbitrary helpers, etc.).

### Insert / update (`insert`, `update`)

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | See [field-types.md](field-types.md) |
| `default` | `any` | Insert default |
| `value` | `any` | Update value / select2 `{ value, label }` |
| `placeholder` | `string` | |
| `disabled` / `readonly` / `required` | `boolean` | |
| `dontsave` | `boolean` | Omit on submit |
| `options` | `array` \| `object` | **Required** for `select` (and similar) when create/update is enabled |
| `attrs` | `object` | Extra HTML attributes |
| `events` | `array` | `{ event, callback }` — use `[]` if none |

Check types with `KGrid.isValidInputType(type)`.

### Filter (`filter`)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `string` | `text` | Control type |
| `operator` | `string` | `~=~` | `data-operator` for KViews (`~=~`, `=`, …) |
| `default` | `any` | | Initial value |
| `placeholder` | `string` | `""` | |
| `options` | `array` \| `object` | | For `select`, `multi_select`, `select2`, … |
| `persist` | `boolean` | `false` | Re-apply `default` on filter reset (also implied when column `hidden` or `type: "hidden"`) |
| `debounceMs` | `number` | `configure({ filterDebounceMs })` | Ms to wait after typing before filter API call; `0` = immediate |

Check types with `KGrid.isValidFilterType(type)`.

Filter controls use `form=""` pointing at a hidden `<form>` (rows cannot wrap one `<form>`). Filter submits are debounced by default (`filterDebounceMs: 300`); set `debounceMs: 0` on a column/filter to make that control submit immediately.

---

## Field types (summary)

| Type | Context | Notes |
|------|---------|--------|
| Native HTML | filter, insert, update | `text`, `number`, `select`, … |
| `multi_select` | filter | Built-in |
| `date_range` | filter | Built-in single date input |
| `select2` | filter, insert, update | `customInputTypes: { select2: KGrid.select2(fn) }` + `kgrid-widgets.js` |
| `autosuggest` | filter, insert, update | `customInputTypes: { autosuggest: KGrid.autosuggest(fn) }` + `kgrid-widgets.js` |
| Custom | any | `customInputTypes` or `registerFieldType` |

Details: [field-types.md](field-types.md).

---

## Shell / DOM (generated by KGrid)

Pass an **empty host element** to `KGrid.init`. KGrid parses `KGrid.TABLE_SHELL_TEMPLATE` (HTML in `src/table-shell.js`), substitutes placeholders from the options below, and appends the `<table>`.

Full guide: **[table-shell.md](table-shell.md)**.

### Shell options

| Option | Default | Description |
|--------|---------|-------------|
| `pagingPageSizes` | `[10, 25, 50, 75]` | Values for `<select class="pagesize">` (`{{PAGE_SIZE_OPTIONS}}`) |
| `pagingDefaultSize` | `10` | Selected page size and `data-pagesize` on `.pages` |
| `emptyRowMessage` | `"No records match your search."` | `{{EMPTY_ROW_MESSAGE}}` in `.no-data-tbody` |
| `pagingFooterLabel` | `"records per page. Total"` | `{{PAGING_FOOTER_LABEL}}` before `.totalrecscount` |

`noDataTemplate` still replaces the empty row content after init.

### Custom markup

- **Edit** `TABLE_SHELL_TEMPLATE` in the library source, or
- **Pre-insert** your own `<table class="custom-table">` in the host (KGrid skips generation), or
- Call `KGrid.renderTableShellHtml(opts, yourTemplate)` when building manually.

Row forms are hidden anchors inside cells (`form=""` on controls).
