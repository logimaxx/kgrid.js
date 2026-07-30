# API reference

## Global: `window.KGrid`

### `KGrid.configure(overrides)`

Merge host integration hooks. Call before initializing tables.

| Hook | Signature | Default |
|------|-----------|---------|
| `log` | `(...args) => void` | No-op |
| `onError` | `(err) => void` | `console.error` |
| `confirm` | `(message, onConfirm, onCancel?) => void` | `window.confirm` |
| `deleteConfirm` | `(context, onConfirm, onCancel?) => void` | `null` — falls back to `confirm` + `DEFAULT_DELETE_CONFIRM_MESSAGE` |
| `serializeForm` | `(form, columns?) => object` | `FormData` → plain object |
| `kviews` | KViews module | `window.KViews` |
| `customInputTypes` | `Record<string, FieldTypePlugin>` | Each value: `{ create, mount?, … }` (use `KGrid.select2(fn)` etc.) |
| `filterDebounceMs` | `number` | Default delay (ms) before filter API submit on the resolved submit event (`input` or `change`); `0` = immediate (default `300`) |
| `fieldTypes` | same as `customInputTypes` | **Deprecated** alias |

Returns `KGrid` (chainable). Re-syncs `customInputTypes` on every call.

### `KGrid.getKViews(override?)`

Resolves KViews in order:

1. `override` (e.g. `opts.kviews` from `init`)
2. `KGrid._config.kviews` from `configure`
3. `window.KViews`

Returns `null` if missing. `init` throws `KGrid.KVIEWS_MISSING_MSG`.

### Field type registry

| Symbol | Description |
|--------|-------------|
| `KGrid.registerFieldType(name, plugin, { overwrite? })` | Register pluggable widget |
| `KGrid.unregisterFieldType(name)` | Remove a registered type |
| `KGrid.inputType(mount, { element, … })` | Build a simple plugin (core) |
| `KGrid.select2(wrapper)` / `KGrid.autosuggest(wrapper)` | Build plugins (`integrations/kgrid-widgets.js`) |
| `KGrid.getFieldType(name)` | Lookup or `null` |
| `KGrid.listFieldTypes()` | Registered type names |
| `KGrid.createFieldInput({ mode, col, config })` | Build DOM (`mode`: `filter` \| `insert` \| `update`) |
| `KGrid.mountField(opts)` | Run plugin `mount` |
| `KGrid.bindFilterInputEvents({ type, $input, onSubmit, createResult? })` | Bind filter submit (uses `filterEvents` + `bindFilterSubmit`) |
| `KGrid.resolveFilterEvents({ plugin, $input, createResult? })` | Resolve event string for a filter control |
| `KGrid.bindFieldFilterSubmit(type, $input, onSubmit)` | Plugin-only extra filter events |
| `KGrid.isPluggableFieldType(type)` | Registered plugin? |
| `KGrid.isValidInputType(type)` | Native or plugin (insert/update) |
| `KGrid.isValidFilterType(type)` | Native or plugin (filter) |

See [field-types.md](field-types.md).

**Internal helpers:**

- `KGrid.log`, `onError`, `confirm`, `runDeleteConfirm`, `serializeForm`
- `KGrid.DEFAULT_DELETE_CONFIRM_MESSAGE` — default text when `deleteConfirm` is not set

`KGrid.select2.helpers` — Select2 option helpers (after loading `kgrid-widgets.js`).

### `KGrid.resolveHostElement(host)`

Normalizes the mount target: **DOM `Element`** or **jQuery** collection (non-empty). Throws otherwise.

### `KGrid.init(host, opts)`

Async table initializer.

**Parameters**

- `host` — empty DOM element or jQuery node (KGrid builds the table), or a host that already contains `<table>` (see [configuration.md](configuration.md#shell--dom-generated-by-kgrid))
- `opts` — table config; optional `opts.kviews`

**Returns:** `Promise<KGridTable>` with:

| Property / method | Description |
|-------------------|-------------|
| `$host` | jQuery root |
| `instance` | KViews collection |
| `filterForm` | `FilterForm` or setup result |
| `find(sel)` | ` $host.find(sel)` |
| `setInteraction`, `getInteraction`, `toggleEditMode`, `setEditMode` | Interaction mode |

### Prototypes

| Symbol | Description |
|--------|-------------|
| `KGrid.protoOptions` | Default table options |
| `KGrid.protoColumnConfig` | Default column |
| `KGrid.VALID_NATIVE_INPUT_TYPES` | Native HTML types |
| `KGrid.VALID_NATIVE_FILTER_TYPES` | Native filter types |
| `KGrid.VALID_INPUT_TYPES` | **Deprecated** — use `isValidInputType()` |
| `KGrid.VALID_FILTER_TYPES` | **Deprecated** — use `isValidFilterType()` |
| `KGrid.setDefaultValues(proto, partial)` | Deep-merge |
| `KGrid.normalizeColumnConfig(col)` | Proto merge + `input` shorthand + events defaults |
| `KGrid.isPlainObject(value)` | Realm-safe plain-object check |
| `KGrid.FilterForm` | Programmatic filter helper (`.filter`, `.ensure`, `.reset`) |

### Table shell template

See **[table-shell.md](table-shell.md)** for structure, placeholders, and customization.

| Symbol | Description |
|--------|-------------|
| `KGrid.TABLE_SHELL_TEMPLATE` | Default HTML string (`src/table-shell.js`) |
| `KGrid.renderTableShellHtml(options, template?)` | Replace `{{EMPTY_ROW_MESSAGE}}`, `{{PAGE_SIZE_OPTIONS}}`, `{{PAGES_DATA_PAGESIZE}}`, `{{PAGING_FOOTER_LABEL}}` |
| `KGrid.createTableShell(options)` | Render template → jQuery `<table>`; applies `tableAttrs` |
| `KGrid.mountTableShell($host, options)` | Append generated table when host is empty |

### Row actions column

| Symbol | Description |
|--------|-------------|
| `KGrid.hasActionColumn(options)` | `true` when `features.delete`, `features.update`, or `features.create` is enabled |
| `KGrid.syncActionColumnColgroup($table, dataColumnCount, hasActions)` | Prepends `<colgroup>` so the actions column can collapse in view mode without reserving width |

Requires `styles/table.css` for view/edit visibility rules on `.kgrid-row-actions` and `col.kgrid-row-actions-col`.

### Low-level setup (advanced / tests)

`setupLabelsHeader`, `setupFilterHeader`, `setupPagingFooter`, `setupNoDataTbody`, `setupNewRecordForm`, `setupDataBody`, `setupCell`, `setupEvents`, `resolveDefaultInteraction`, `getTableInteractionHost`, `applyInteraction`, `uuid`, `anchorRowForm`, `filterFormField`

---

## Table instance (`KGrid.init` return value)

### Properties

| Property | Description |
|----------|-------------|
| `grid.instance` | KViews collection (`loadFromRemote`, `insert` / `newItem`, items) |
| `grid.filterForm` | `FilterForm` |
| `grid.$host` | jQuery host |

### Methods

#### `grid.setInteraction(mode, overrides?)`

`mode`: `'view'` | `'edit'`. Optional `{ create, update, delete }` → `data-allow-*`.

Toggling view ↔ edit also shows or hides the row-actions column (see [configuration.md](configuration.md#row-actions-column)).

#### `grid.getInteraction()`

`'view'` or `'edit'`.

#### `grid.setEditMode(boolean)` — deprecated

Use `setInteraction`.

#### `grid.toggleEditMode(editMode?)` — deprecated

- `boolean` → set mode
- no arg / DOM event → toggle view ↔ edit

---

## `KGrid.FilterForm`

```javascript
grid.filterForm.filter(name, value, operator = "~=~")
grid.filterForm.reset()
```

---

## KViews integration

`createCollectionInstance` options:

```javascript
{
  dontload: true,
  setAttrAsId: options.setAttrAsId ?? false,
  itemListeners: {
    afterrender: (item) => KGrid.setupEvents(item, table, options, colMap),
  },
}
```

`.main-tbody` jQuery `.data()`:

| Key | When |
|-----|------|
| `emptyview` | Always |
| `sort` | `features.sorting` |
| `paging`, `pagesizeinp`, `totalrecscount` | `features.paging` |
| `filter` | `features.filtering` |
| `type` | `options.type` |

Per-item URLs: `{base}/{id}` for update/delete.
