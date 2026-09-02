# Field types

KGrid builds filter, insert, and update controls from `filter.type`, `insert.type`, and `update.type`.

| Category | Examples | Setup |
|----------|----------|--------|
| **Native HTML** | `text`, `number`, `select`, … | Built in |
| **DOM built-ins** | `multi_select`, `date_range` | Built in |
| **Your widgets** | `select2`, `autosuggest`, anything | `configure({ customInputTypes })` |

Check types: `KGrid.isValidInputType(type)`, `KGrid.isValidFilterType(type)`.

## Custom input types (one pattern)

Register plugins once in `configure`. Each value must be a **plugin** — an object with at least `create()`:

```javascript
KGrid.configure({
  customInputTypes: {
    select2: KGrid.select2(select2wrapper),           // after kgrid-widgets.js
    autosuggest: KGrid.autosuggest(function ($i, o) { return $i.autosuggest(o); }),
    rating: {
      create() {
        return { $input: $("<input type='range' min='1' max='5'/>") };
      },
    },
  },
});
```

Columns use the name: `filter: { type: "select2", options: { url, idFld, labelFld } }`.

Remove a type with `null`: `customInputTypes: { select2: null }`.

### Lifecycle (what the plugin does)

1. **`create({ mode, col, config })`** — build the control; return `{ $input: jQuery }`.
2. **`mount({ mode, $input, config, col, … })`** — optional; init Select2, autosuggest, etc. after the node is in the table.
3. **`validate?(config, mode, col)`** — optional; throw on bad column config.
4. **`filterEvents?`** — optional on the plugin (or on the object returned from `create()` in filter mode): jQuery event names that submit the filter form (`"change"`, `"input"`, …). Set `false` when the widget only uses `bindFilterSubmit` (e.g. Select2). If omitted: `"change"` for `<select>`, `"input"` otherwise.
5. **`filterDebounceMs?`** — optional on plugin; column `filter.debounceMs` overrides. Global default: `KGrid.configure({ filterDebounceMs: 300 })`. When `debounceMs > 0`, filter submissions are debounced for the resolved submit event (`"input"` or `"change"` depending on control).
6. **`bindFilterSubmit?($input, onSubmit)`** — optional; widget-specific events (`select2:select`, …) in addition to `filterEvents`.

### Helpers

| Helper | Use for |
|--------|---------|
| `KGrid.select2(wrapper)` | Select2 (`integrations/kgrid-widgets.js`) |
| `KGrid.autosuggest(wrapper)` | Autosuggest (same file) |
| `KGrid.inputType(mount, { element })` | Any “static HTML + mount widget” control |

Simple custom control without an integration file:

```javascript
customInputTypes: {
  color: KGrid.inputType(
    function ($input) { /* init widget */ },
    { element: "<input type='color' class='form-control form-control-sm'/>", filterEvents: "change" }
  ),
}
```

### Minimal example (no extra libraries)

See [`integrations/kgrid-plugin-demo-select.js`](../integrations/kgrid-plugin-demo-select.js) and the [demo](../demo/) **Category** column:

```javascript
KGrid.configure({
  customInputTypes: { demo_select: KGrid.demoSelect() },
});
// column: filter / insert / update { type: "demo_select", options: [...] }
```

### Load order (Select2 / autosuggest)

1. jQuery, KViews, `kgrid.js`
2. `integrations/kgrid-widgets.js` (defines `KGrid.select2`, `KGrid.autosuggest`)
3. Select2 / autosuggest libraries
4. `KGrid.configure({ customInputTypes: … })`
5. `KGrid.init(…)`

## Native HTML & built-ins

See previous sections in this file for `select`, `multi_select`, `date_range`. Native types need no registration.

### `checkbox` — boolean flag toggle

`filter` / `insert` / `update` `{ type: "checkbox" }` is always a **flag**, not a multi-value checkbox group.

- UI: Bootstrap `form-check form-switch` (`role="switch"`).
- Serialized value is always `"1"` or `"0"`. Unchecked still appears in the payload (unlike `FormData`).
- On if the record value is `true`, `1`, or `"1"`; everything else is off.
- Do not set `update.value` from the field (`value: "{{flag}}"`). KGrid sets `checked` from `item.attributes` after render.

```javascript
{
  name: "lot_tracked",
  display: { template: "{{#if (equals lot_tracked '1')}}Da{{else}}—{{/if}}" },
  insert: { type: "checkbox", default: "0" },
  update: { type: "checkbox" },
}
```

`KGrid.isFlagOn(v)` is the same on/off rule used for `checked` and insert defaults.

Filter checkboxes are not coerced to `"0"` when empty — filter submit is separate and unchecked means “no filter”.

## Direct API

`KGrid.registerFieldType(name, plugin)` — same plugin shape; useful in tests or dynamic registration.

## Display templates

`display.template` uses KViews/Handlebars. Keep templates simple (`{{field}}`) unless your app registers helpers globally.
