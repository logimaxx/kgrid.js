# Integration guide

KGrid is designed to run inside a host application that provides jQuery and KViews. The host wires UI conventions (confirm dialogs, Select2, form serialization) through **`KGrid.configure()`**.

## Load order

1. jQuery
2. KViews (+ Handlebars)
3. Optional: Select2, autosuggest (if used)
4. `kgrid/dist/kgrid.js`
5. Your `kgrid-config.js` (calls `KGrid.configure`)
6. Mount tables: `await KGrid.init(hostElement, opts)`

## KViews resolution

KGrid needs the KViews API (`createCollectionInstance`). It is resolved in this order:

1. `opts.kviews` passed to `KGrid.init(host, opts)`
2. `KGrid.configure({ kviews: KViews })`
3. `window.KViews` (script tag from `@logimaxx/kviews`)

Install the peer dependency: `npm install @logimaxx/kviews jquery`.

Bundled apps can pass the module explicitly:

```javascript
import KViews from "@logimaxx/kviews";
KGrid.configure({ kviews: KViews });
```

## Pluggable field types

Filter, insert, and update controls use a **field type registry** (native HTML, built-ins, integrations, custom plugins).

Full reference: **[field-types.md](field-types.md)**.

| Category | Types | How they load |
|----------|--------|----------------|
| Native HTML | `text`, `select`, `number`, … | Always |
| DOM built-ins | `multi_select`, `date_range` | Always registered |
| Integrations | `select2`, `autosuggest` | When `configure({ select2 })` / `configure({ autosuggest })` is set |
| Custom | any name | `registerFieldType` or `configure({ fieldTypes })` |

`select2` / `autosuggest` are removed from the registry if you clear the corresponding `configure` hook.

## Minimal `kgrid-config.js`

```javascript
KGrid.configure({
  log: console.log.bind(console),
  onError: function (err) {
    console.error("[KGrid]", err);
  },
  confirm: function (message, onConfirm, onCancel) {
    if (window.confirm(message)) {
      onConfirm();
    } else if (onCancel) {
      onCancel();
    }
  },
});
```

## `serializeForm`

Default implementation reads `FormData` and builds a plain object. Duplicate field names become arrays.

Override when your API expects different shapes (nested objects, typed booleans, etc.):

```javascript
KGrid.configure({
  serializeForm: function (form, columns) {
    const data = Object.fromEntries(new FormData(form).entries());
    // Example: coerce checkboxes
    columns?.forEach((col) => {
      if (col.update?.type === "checkbox" && !(col.name in data)) {
        data[col.name] = false;
      }
    });
    return data;
  },
});
```

Used for:

- Filter form submission (KViews)
- Row edit forms (`features.update`)
- New record row (`features.create`)

Fields with `insert.dontsave` or `update.dontsave` are stripped before `newItem` / `update`.

## `deleteConfirm` (row delete)

Used when the user clicks the delete button on a row. The host shows any UI it wants, then calls `onConfirm()` to run `item.delete()` or `onCancel()` to dismiss (KGrid removes the `confirm-delete` row highlight).

**Per table:** pass `deleteConfirm` in `KGrid.init(host, { deleteConfirm, … })` — overrides the global hook for that grid only.

```javascript
KGrid.configure({
  deleteConfirm: function (context, onConfirm, onCancel) {
    // context.item — KViews item; context.view — row view; context.options — table opts
    myApp.modal.confirm({
      title: "Delete",
      body: "Remove " + (context.item.attributes.name || "this row") + "?",
    }).then(function (ok) {
      if (ok) onConfirm();
      else if (onCancel) onCancel();
    });
  },
});
```

If neither `configure({ deleteConfirm })` nor `init({ deleteConfirm })` is set, KGrid calls `confirm` with `KGrid.DEFAULT_DELETE_CONFIRM_MESSAGE` (`"Delete this record?"`).

## `confirm`

Generic message dialog (used by the default delete flow). Default uses `window.confirm`.

Replace with a modal:

```javascript
KGrid.configure({
  confirm: function (message, onConfirm, onCancel) {
    myApp.modal.confirm(message).then(function (ok) {
      if (ok) onConfirm();
      else if (onCancel) onCancel();
    });
  },
});
```

## Select2

Required when any column uses `type: "select2"` in filter, insert, or update.

```javascript
KGrid.configure({
  select2: function ($input, options) {
    // options: { url, idFld, labelFld, default?, ... }
    $input.select2({
      ajax: {
        url: options.url,
        dataType: "json",
        // map idFld / labelFld in processResults
      },
    });
    if (options.default) {
      const opt = new Option(options.default.label, options.default.value, true, true);
      $input.append(opt).trigger("change");
    }
  },
});
```

If `select2` is not configured, columns with `type: "select2"` fail at mount time (field type not registered).

## Autosuggest

Default calls jQuery plugin `$input.autosuggest(options)` if present.

```javascript
KGrid.configure({
  autosuggest: function ($input, options) {
    return $input.autosuggest({
      url: options.url,
      labelFld: options.labelFld,
      idFld: options.idFld,
      onselect: options.onselect,
    });
  },
});
```

For **update** mode, `options` must include `url`, `idFld`, and `labelFld`.

## MAXXOPS example

See [`integrations/maxxops.example.js`](../integrations/maxxops.example.js):

```javascript
KGrid.configure({
  log: typeof klog === "function" ? klog : console.log.bind(console),
  onError: modal_error,
  confirm: modal_confirm,
  serializeForm: serializeFormData2,
  select2: select2wrapper,
  autosuggest: function ($input, options) {
    return $input.autosuggest(options);
  },
});
```

Load after `lib.js`, `select2.js`, `autosuggest.js`, and `kgrid.js`.

## Styling

Include the bundled stylesheet:

```html
<link rel="stylesheet" href="node_modules/@logimaxx/kgrid/styles/table.css">
```

Recommended on the host page (used by the default table template):

- **Bootstrap** — paging buttons (`btn`, `btn-sm`, …)
- **Font Awesome** — sort icons in `.thead-labels` (`fa-sort`, `fa-sort-up`, `fa-sort-down`)

Interaction modes rely on attributes on `.custom-table-shell`:

- `data-interaction="view|edit"` — in **view**, data cells show display templates; in **edit**, inline inputs and the row-actions column are shown
- `data-allow-insert`, `data-allow-update`, `data-allow-delete` (optional overrides in edit mode)

**Row actions column** (`.kgrid-row-actions`, `col.kgrid-row-actions-col`):

- Added when `features.create`, `features.update`, or `features.delete` is enabled
- Collapsed in view so the table spans the full width; expanded in edit (~100px) for delete / save / cancel
- Do not remove these classes if you customize markup; include `styles/table.css` from the package

### Table markup

The host can be an **empty** `<div>`. KGrid injects HTML from `KGrid.TABLE_SHELL_TEMPLATE` (see [table-shell.md](table-shell.md)). Customize via `emptyRowMessage`, `pagingPageSizes`, etc., or edit the template in `src/table-shell.js`.

`noDataTemplate` overrides the empty row after init.

## Error handling

Remote load errors in `init` are passed to `KGrid.onError` (does not rethrow). CRUD failures from row actions also use `onError`.

## npm package (`@logimaxx/kgrid`)

Published files:

- `dist/` — `kgrid.js`, `kgrid.min.js`
- `src/` — source (concatenated by `scripts/build.js`)
- `styles/table.css`
- `integrations/` — host examples

Peers: `jquery`, `@logimaxx/kviews`.

`npm run build` before publish; `prepare` runs build on install.

## Demo server

```bash
npm run demo   # node demo/server.js — static + /api/products JSON:API mock
```

See [demo/README.md](../demo/README.md).

## Development

```bash
git clone https://github.com/logimaxx/kgrid.git
cd kgrid
npm install
npm test
npm run build
```

Link locally from another project:

```bash
npm install file:../kgrid
```
