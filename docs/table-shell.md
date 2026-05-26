# Table shell template

KGrid does not require you to write table HTML. On `KGrid.init(host, opts)`, an **empty host** is filled with markup from an internal HTML template.

## Where the template lives

| Location | Purpose |
|----------|---------|
| `src/table-shell.js` → `KGrid.TABLE_SHELL_TEMPLATE` | Default markup (edit when forking KGrid) |
| `KGrid.renderTableShellHtml(options, template?)` | Runtime: pass your own HTML string |
| Host with existing `<table>` | Skip generation; use your markup |

After `npm install`, the template is inside the built bundle (`dist/kgrid.js`). To change defaults in a consuming app without patching the package, pass a custom template to `renderTableShellHtml` before mount (see below).

## DOM structure

```
.custom-table-shell          ← class added on host if missing
  table.custom-table
    colgroup.kgrid-colgroup  ← injected at init (data cols + optional row-actions col)
    thead.thead-labels       ← one <th> template; cloned per column in labels.js
    thead.thead-filters      ← filter inputs (if features.filtering)
    tbody.before-main-tbody  ← insert row when position: top
    tbody.main-tbody         ← KViews collection rows
    tbody.after-main-tbody   ← insert row when position: bottom
    tbody.no-data-tbody      ← empty state
    tfoot.paging-footer      ← removed when features.paging is false
```

Required class names and regions are part of the public contract — `setupLabelsHeader`, `setupFilterHeader`, `setupDataBody`, etc. depend on them.

## Template placeholders

Static HTML uses `{{NAME}}` slots filled by `renderTableShellHtml`:

| Placeholder | Table option | Description |
|-------------|--------------|-------------|
| `{{EMPTY_ROW_MESSAGE}}` | `emptyRowMessage` | Text in `.no-data-tbody` (HTML-escaped) |
| `{{PAGES_DATA_PAGESIZE}}` | `pagingDefaultSize` | `data-pagesize` on `.pages` |
| `{{PAGE_SIZE_OPTIONS}}` | `pagingPageSizes` + `pagingDefaultSize` | `<option>` lines for `.pagesize` |
| `{{PAGING_FOOTER_LABEL}}` | `pagingFooterLabel` | Text before `.totalrecscount` (escaped) |

Defaults (from `protoOptions`):

```javascript
pagingPageSizes: [10, 25, 50, 75],
pagingDefaultSize: 10,
emptyRowMessage: null,  // → "No records match your search."
pagingFooterLabel: "records per page. Total",
```

`noDataTemplate` in table options still overrides the empty row **after** init (via `setupNoDataTbody`).

## Customize defaults in table options

```javascript
await KGrid.init("#grid", {
  url: "/api/items",
  type: "items",
  emptyRowMessage: "No items found.",
  pagingPageSizes: [5, 10, 25],
  pagingDefaultSize: 5,
  pagingFooterLabel: "rows per page. Total",
  columns: [/* ... */],
});
```

## Custom HTML template

Keep the same class names and one sortable `<th>` template in `.thead-labels`. You may use the same four placeholders.

```javascript
const myTemplate = `
<table class="custom-table" style="table-layout: fixed;">
  <!-- same regions as TABLE_SHELL_TEMPLATE -->
  <tbody class="no-data-tbody"><tr><td>{{EMPTY_ROW_MESSAGE}}</td></tr></tbody>
  <!-- ... -->
</table>`.trim();

const html = KGrid.renderTableShellHtml(opts, myTemplate);
const $table = $(jQuery.parseHTML(html, document, true)).filter("table");
$("#host").addClass("custom-table-shell").append($table);
// then run setup manually, or init on host that already contains $table[0]
```

Simplest path: put your table inside the host before init — KGrid detects it and skips generation:

```html
<div id="grid">
  <table class="custom-table">…your structure…</table>
</div>
```

## Styling and icons

- Include `styles/table.css` from the package (required for view/edit modes and row-actions column collapse).
- The default template uses **Bootstrap** button classes (`btn`, `btn-sm`, …) and **Font Awesome** sort icons (`fa-sort`, `fa-sort-up`, `fa-sort-down`). Load both in the host page, or edit the template to match your design system.

If you provide your own `<table>` in the host, call `KGrid.init` as usual — `syncActionColumnColgroup` still runs when row actions are enabled.

## API

| Method | Description |
|--------|-------------|
| `KGrid.TABLE_SHELL_TEMPLATE` | Default HTML string |
| `KGrid.renderTableShellHtml(options, template?)` | Substitute placeholders |
| `KGrid.createTableShell(options)` | Template → jQuery `<table>` (applies `tableAttrs`) |
| `KGrid.mountTableShell($host, options)` | Append table when host has none |

See also [configuration.md](configuration.md) and [api.md](api.md).
