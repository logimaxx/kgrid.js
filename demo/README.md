# KGrid demo

Interactive demo with a **JSON:API** backend (Node.js, in-memory) and full CRUD through KGrid + KViews.

## Run

From the repository root:

```bash
npm install
npm run build
npm run demo
```

Open [http://localhost:5173/demo/](http://localhost:5173/demo/)

The server serves static assets and the API at `/api/products`.

## API behaviour (mock, no disk writes)

| Method | Path | Response |
|--------|------|----------|
| `GET` | `/api/products` | Collection document (`meta.totalRecords`, `data[]`) |
| `POST` | `/api/products` | `201` + created resource (`id` = random, `attributes` from body) |
| `PATCH` | `/api/products/:id` | `200` + merged resource (seed row + patch attributes) |
| `DELETE` | `/api/products/:id` | `204` no body |

List supports KViews query params: `filter`, `sort`, `page[products][offset]`, `page[products][limit]`.

Data lives in memory only. **Restart the server** to reload the seed file [`data/products.json`](data/products.json).

## Seed data

[`data/products.json`](data/products.json) is the initial catalog (JSON:API shape, `type: products`). The API does not write back to this file.

## Markup

The page uses an empty `#kgrid-host`; KGrid builds the table from its internal HTML template (no hand-written `<table>` in `index.html`).

## UI

- **Switch to edit mode** — `kgridDemo.toggleEditMode()`; inline edit + save per row
- **Insert row** — top of table (create); server returns new `id`
- **Delete** — per-row trash in edit mode
- Native `select` columns (no Handlebars helpers in controls)

## Debug

```javascript
window.KGRID_DEMO_DEBUG = true;
location.reload();
```

Console: `kgridDemo.toggleEditMode()`, `kgridDemo.instance.loadFromRemote()`.
