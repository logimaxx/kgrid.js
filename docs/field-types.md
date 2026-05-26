# Field types

KGrid builds filter, insert, and update controls from each column’s `filter.type`, `insert.type`, and `update.type`. Types fall into three categories:

| Category | Examples | Setup |
|----------|----------|--------|
| **Native HTML** | `text`, `number`, `date`, `select`, `textarea`, … | Always available |
| **DOM built-ins** | `multi_select`, `date_range` | Always registered |
| **Integrations** | `select2`, `autosuggest` | Registered when you pass wrappers in `KGrid.configure()` |
| **Custom** | any name you choose | `KGrid.registerFieldType()` or `configure({ fieldTypes })` |

Use `KGrid.isValidInputType(type)` and `KGrid.isValidFilterType(type)` instead of the deprecated `VALID_INPUT_TYPES` / `VALID_FILTER_TYPES` arrays.

## Native HTML types

**Insert / update** (`VALID_NATIVE_INPUT_TYPES`):

`displayonly`, `text`, `textarea`, `number`, `date`, `datetime`, `time`, `checkbox`, `radio`, `file`, `password`, `email`, `url`, `search`, `tel`, `select`, `hidden`

**Filter** (same set minus `displayonly`, plus pluggable types):

`multi_select`, `date_range`, `select2`, `autosuggest`, and any registered custom type.

### `select` (native)

Options are built with jQuery — **no Handlebars helpers** in the control markup. After each row renders, update-mode `<select>` values are set from `item.attributes` in `setupEvents`.

```javascript
update: {
  type: "select",
  options: [
    { label: "Hardware", value: "hardware" },
    { label: "Software", value: "software" },
  ],
  events: [],
}
```

### `multi_select` (filter)

```javascript
filter: {
  type: "multi_select",
  options: [
    { label: "A", value: "a" },
    { label: "B", value: "b" },
  ],
}
```

### `date_range` (filter)

Single date input (filter row). For a true from/to range, register a custom field type (see below).

## Integration types (`select2`, `autosuggest`)

These are **not** bundled. When you call `KGrid.configure({ select2: fn })` or `configure({ autosuggest: fn })`, KGrid registers the corresponding field type plugin. Removing the hook unregisters the type.

Remote lookup config (`insert` / `update` / filter where applicable):

```javascript
options: {
  url: "/api/lookup",
  idFld: "id",
  labelFld: "name",
}
```

Filter `select2` may omit `url` / `idFld` / `labelFld` validation; insert/update require them.

## Custom field type plugin

```javascript
KGrid.registerFieldType("daterange", {
  validate(config, mode, col) {
    if (!config.startName || !config.endName) {
      throw new Error("daterange: startName and endName required");
    }
  },
  create({ mode, col, config }) {
    const $wrap = $("<div class='d-flex gap-1'/>");
    const $start = $("<input type='date' class='form-control form-control-sm'/>")
      .attr("name", config.startName);
    const $end = $("<input type='date' class='form-control form-control-sm'/>")
      .attr("name", config.endName);
    $wrap.append($start, $end);
    return { $input: $wrap, skipValueAttr: true };
  },
  bindFilterSubmit($input, onSubmit) {
    $input.find("input").on("change", onSubmit);
  },
  mount({ mode, $input, config, item }) {
    // optional: widget init after row render (update mode)
  },
});
```

| Hook | Required | Purpose |
|------|----------|---------|
| `create({ mode, col, config })` | Yes | Return `{ $input: jQuery, skipValueAttr?: boolean }` |
| `validate(config, mode, col)` | No | Throw on bad column config |
| `mount(opts)` | No | Initialize widget after DOM is in the page |
| `bindFilterSubmit($input, onSubmit)` | No | Extra filter events (e.g. Select2 clear) |

`mode` is `"filter"`, `"insert"`, or `"update"`.

Bulk registration:

```javascript
KGrid.configure({
  fieldTypes: {
    daterange: { /* plugin */ },
  },
});
```

## Display templates (Handlebars)

`display.template` is compiled by **KViews** (Handlebars). Stick to simple interpolations (`{{name}}`) unless your app registers helpers globally. Avoid helpers like `eq` in templates unless you provide them — KGrid does not register Handlebars helpers.

## API summary

| Method | Description |
|--------|-------------|
| `KGrid.registerFieldType(name, plugin, { overwrite? })` | Register or replace a type |
| `KGrid.getFieldType(name)` | Lookup plugin |
| `KGrid.listFieldTypes()` | All registered names |
| `KGrid.createFieldInput({ mode, col, config })` | Build control (internal / tests) |
| `KGrid.mountField(opts)` | Run `mount` hook |
| `KGrid.isPluggableFieldType(type)` | Registered plugin type? |

See also [integration.md](integration.md) for `configure()` and host wrappers.
