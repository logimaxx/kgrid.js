# Configuration reference

KGrid tables are driven by a JSON options object passed to `KGrid.init(host, opts)` where `host` is a DOM element or jQuery object (empty, or already containing a `<table>`).

Defaults: `KGrid.protoOptions` (table), `KGrid.protoColumnConfig` (columns). Per-column settings are deep-merged via `KGrid.setDefaultValues`.

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

```javascript
// Remote JSON:API (typical)
{
  url: "/api/products",
  updateUrl: "/api/products",
  deleteUrl: "/api/products",
  insertUrl: "/api/products",
  type: "products",
}

// Local
{ data: [{ id: 1, name: "Alpha" }] }
```

### Features

```javascript
features: {
  filtering: false,
  sorting: false,
  paging: false,
  create: false,
  update: false,
  delete: false,
}
```

### Row actions column

When any of `create`, `update`, or `delete` is enabled, KGrid adds a trailing column for row controls (delete, save/cancel, insert submit). The same rule is used everywhere so header, filter row, data rows, and `colspan` stay aligned:

```javascript
KGrid.hasActionColumn(options)
// true when features.delete || features.update || features.create
```

| Markup | Role |
|--------|------|
| `th` / `td.kgrid-row-actions` | Header, filters, data rows |
| `colgroup col.kgrid-row-actions-col` | Width control for `table-layout: fixed` (added at init via `syncActionColumnColgroup`) |

**View vs edit:** In **view** mode (`data-interaction="view"`), the row-actions column is collapsed (`visibility: collapse`, zero width) so data columns use the full table width. In **edit** mode, the column is shown (~100px) with delete / save / cancel buttons and the insert-row submit cell.

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

Also resolvable via `options.functions[callbackName]`.

## Column configuration

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Field name (required for sort/filter/update) |
| `label` | `string` | Header text |
| `hidden` | `boolean` | Hide from UI; may still be in forms |
| `attrs` | `object` | HTML attributes on header/cells |
| `features` | `object` | `create`, `update`, `filter`, `sort` per column |

### Display (`display`)

| Field | Type | Description |
|-------|------|-------------|
| `template` | `string` | Handlebars HTML; default `{{fieldName}}` |
| `events` | `array` | `{ selector, event, callback }` |

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
| `options` | `array` \| `object` | `select` options or remote widget config |
| `attrs` | `object` | Extra HTML attributes |
| `events` | `array` | `{ event, callback }` |

Check types with `KGrid.isValidInputType(type)`.

### Filter (`filter`)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `string` | `text` | Control type |
| `operator` | `string` | `~=~` | `data-operator` for KViews (`~=~`, `=`, …) |
| `default` | `any` | | Initial value |
| `placeholder` | `string` | `""` | |
| `options` | `array` \| `object` | | For `select`, `multi_select`, `select2`, … |

Check types with `KGrid.isValidFilterType(type)`.

Filter controls use `form=""` pointing at a hidden `<form>` (rows cannot wrap one `<form>`).

## Field types (summary)

| Type | Context | Notes |
|------|---------|--------|
| Native HTML | filter, insert, update | `text`, `number`, `select`, … |
| `multi_select` | filter | Built-in |
| `date_range` | filter | Built-in single date input |
| `select2` | filter, insert, update | Requires `configure({ select2 })` |
| `autosuggest` | filter, insert, update | Requires `configure({ autosuggest })` |
| Custom | any | `registerFieldType` |

Details: [field-types.md](field-types.md).

## Example: full table config

```javascript
{
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
  },
  insertFormRow: { position: "top" },
  noDataTemplate: "<td colspan='99'>No records match your filters.</td>",
  columns: [
    {
      name: "id",
      label: "ID",
      hidden: true,
      display: { template: "{{id}}", events: [] },
      insert: { type: "hidden", events: [] },
      update: { type: "hidden", events: [] },
    },
    {
      name: "name",
      label: "Name",
      features: { sort: true, filter: true, create: true, update: true },
      display: { template: "{{name}}", events: [] },
      filter: { type: "text", operator: "~=~" },
      insert: { type: "text", required: true, events: [] },
      update: { type: "text", events: [] },
    },
    {
      name: "category",
      label: "Category",
      features: { filter: true, create: true, update: true },
      display: { template: "{{category}}", events: [] },
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
}
```

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
