# KGrid

**KGrid** — tabel declarativ (JSON config) pentru **Komponentor** + **KViews**: filtre, sortare, paginare, insert/update/delete inline.

Global: `window.KGrid`

## Cerințe (peer)

1. jQuery
2. [kviews](https://github.com/logimaxx/kviews.js)
3. (opțional) [komponentor](https://github.com/logimaxx/komponentor.js)
4. Handlebars (KViews)
5. Plugin-uri host: select2 / autosuggest pe `$.fn`, dacă folosești acele coloane

## Instalare

```bash
npm install github:logimaxx/kgrid#main
# dezvoltare locală:
npm install file:../kgrid
```

## Utilizare

```html
<link rel="stylesheet" href="node_modules/kgrid/styles/table.css">
<script src="node_modules/kviews/dist/kviews.js"></script>
<script src="node_modules/kgrid/dist/kgrid.js"></script>
<script src="your-app/kgrid-config.js"></script>
```

### `kgrid-config.js`

```javascript
KGrid.configure({
  log: console.log.bind(console),
  onError: function (err) { console.error(err); },
  confirm: function (msg, ok, cancel) {
    if (confirm(msg)) ok(); else if (cancel) cancel();
  },
  serializeForm: function (form) {
    return Object.fromEntries(new FormData(form).entries());
  },
  select2: function ($input, opts) { /* ... */ },
  autosuggest: function ($input, opts) { $input.autosuggest(opts); },
});
```

Vezi `integrations/maxxops.example.js` pentru MAXXOPS.

## Komponentor

```javascript
komponentor.mount("#host", {
  url: "node_modules/kgrid/komponents/table.html",
  data: { /* columns, url, features, ... */ },
});
```

## API

| Symbol | Descriere |
|--------|-----------|
| `KGrid.configure(opts)` | log, onError, confirm, serializeForm, select2, autosuggest |
| `KGrid.init(k, opts)` | din `init_komponent` |
| `k.setInteraction('view' \| 'edit')` | mod vizualizare / editare |
| `k.filterForm` | `FilterForm` |
| `k.instance` | colecție KViews |

## Build

```bash
npm run build   # → dist/kgrid.js
```
