# Integration guide

## Load order

1. jQuery  
2. KViews  
3. `dist/kgrid.js`  
4. Optional: `integrations/kgrid-widgets.js` + widget libraries (Select2, autosuggest)  
5. `KGrid.configure({ … })`  
6. `KGrid.init(host, opts)`

## Minimal config

```javascript
KGrid.configure({
  onError: function (err) { console.error(err); },
  deleteConfirm: function (ctx, ok, cancel) {
    if (confirm("Delete?")) ok(); else if (cancel) cancel();
  },
});
```

## Custom input types

Optional widgets (Select2, autosuggest, your own):

```javascript
// After kgrid-widgets.js
KGrid.configure({
  customInputTypes: {
    select2: KGrid.select2(function ($input, options) {
      $input.select2({ ajax: { url: options.url, dataType: "json" } });
    }),
    autosuggest: KGrid.autosuggest(function ($input, options) {
      return $input.autosuggest(options);
    }),
  },
});
```

Use `type: "select2"` / `type: "autosuggest"` in column filter, insert, or update config.

Details: [field-types.md](field-types.md).

## KViews

Resolved from `init({ kviews })`, then `configure({ kviews })`, then `window.KViews`.

```javascript
import KViews from "@logimaxx/kviews";
KGrid.configure({ kviews: KViews });
```

## Delete confirmation

```javascript
KGrid.configure({
  deleteConfirm: function (context, onConfirm, onCancel) {
    myApp.modal.confirm("Delete?").then(function (ok) {
      if (ok) onConfirm();
      else if (onCancel) onCancel();
    });
  },
});
```

Per-table: pass `deleteConfirm` in `init(host, { deleteConfirm, … })`.

## MAXXOPS example

[`integrations/maxxops.example.js`](../integrations/maxxops.example.js)

## Styling

```html
<link rel="stylesheet" href="node_modules/@logimaxx/kgrid/styles/table.css">
```

Bootstrap and Font Awesome are recommended for the default paging/sort UI.

See [table-shell.md](table-shell.md) for the DOM contract.
