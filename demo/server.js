#!/usr/bin/env node
/**
 * Demo JSON:API server (in-memory, no disk writes).
 * Serves static assets + /api/products CRUD for KViews/KGrid.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT) || 5173;
const ROOT = path.join(__dirname, "..");
const SEED_FILE = path.join(__dirname, "data", "products.json");
const RESOURCE_TYPE = "products";

/** @type {Array<{ id: string, type: string, attributes: object }>} */
let store = [];

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
};

function loadSeed() {
    const doc = JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
    store = (doc.data || []).map(cloneResource);
}

function cloneResource(r) {
    return {
        id: String(r.id),
        type: r.type || RESOURCE_TYPE,
        attributes: { ...r.attributes },
    };
}

function randomId() {
    return String(Date.now()) + Math.random().toString(36).slice(2, 8);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        req.on("error", reject);
    });
}

function sendJson(res, status, body) {
    const payload = body == null ? "" : JSON.stringify(body);
    res.writeHead(status, {
        "Content-Type": "application/vnd.api+json; charset=utf-8",
        "Content-Length": Buffer.byteLength(payload),
    });
    res.end(payload);
}

function sendNoContent(res) {
    res.writeHead(204);
    res.end();
}

function parseJsonApiData(body) {
    if (!body) {
        return null;
    }
    const doc = JSON.parse(body);
    const data = doc.data;
    if (Array.isArray(data)) {
        return data.map(normalizeIncomingResource);
    }
    return normalizeIncomingResource(data);
}

function normalizeIncomingResource(data) {
    if (!data || typeof data !== "object") {
        return null;
    }
    const attrs = { ...(data.attributes || {}) };
    if (!data.attributes && !data.id && !data.type) {
        Object.assign(attrs, data);
    }
    coerceAttributes(attrs);
    return {
        id: data.id != null ? String(data.id) : undefined,
        type: data.type || RESOURCE_TYPE,
        attributes: attrs,
    };
}

function coerceAttributes(attrs) {
    if (Object.prototype.hasOwnProperty.call(attrs, "active")) {
        const v = attrs.active;
        if (v === "true" || v === true) {
            attrs.active = true;
        } else if (v === "false" || v === false) {
            attrs.active = false;
        }
    }
    if (attrs.price != null && attrs.price !== "") {
        const n = Number(attrs.price);
        if (!Number.isNaN(n)) {
            attrs.price = n;
        }
    }
}

function collectionDocument(items, offset) {
    return {
        meta: {
            totalRecords: items.length,
            offset: offset || 0,
        },
        data: items.map((r) => ({
            id: r.id,
            type: r.type,
            attributes: { ...r.attributes },
        })),
    };
}

function itemDocument(resource) {
    return {
        data: {
            id: resource.id,
            type: resource.type,
            attributes: { ...resource.attributes },
        },
    };
}

function parseFilterClause(clause) {
    for (const op of ["~=~", "~==", "="]) {
        const idx = clause.indexOf(op);
        if (idx > 0) {
            return {
                field: clause.slice(0, idx),
                op,
                value: clause.slice(idx + op.length),
            };
        }
    }
    return null;
}

function matchFilter(resource, filterParam) {
    if (!filterParam) {
        return true;
    }
    const clauses = filterParam.split(",");
    return clauses.every((clause) => {
        const parsed = parseFilterClause(clause.trim());
        if (!parsed) {
            return true;
        }
        const raw = resource.attributes[parsed.field];
        const val = raw == null ? "" : String(raw).toLowerCase();
        const needle = String(parsed.value).toLowerCase();
        if (parsed.op === "~=~" || parsed.op === "~==") {
            return val.includes(needle);
        }
        return val === needle;
    });
}

function applySort(items, sortParam) {
    if (!sortParam) {
        return items;
    }
    const specs = sortParam.split(",").map((part) => {
        const p = part.trim();
        if (p.startsWith("-")) {
            return { field: p.slice(1), desc: true };
        }
        return { field: p, desc: false };
    });
    return [...items].sort((a, b) => {
        for (const { field, desc } of specs) {
            const av = a.attributes[field];
            const bv = b.attributes[field];
            if (av === bv) {
                continue;
            }
            const cmp = av > bv ? 1 : av < bv ? -1 : 0;
            if (cmp !== 0) {
                return desc ? -cmp : cmp;
            }
        }
        return 0;
    });
}

function listResources(url) {
    let items = store.filter((r) => matchFilter(r, url.searchParams.get("filter")));
    items = applySort(items, url.searchParams.get("sort"));

    const total = items.length;
    const offset = parseInt(url.searchParams.get("page[products][offset]") || "0", 10);
    const limit = parseInt(url.searchParams.get("page[products][limit]") || "0", 10);

    if (limit > 0) {
        items = items.slice(offset, offset + limit);
    }

    return {
        meta: { totalRecords: total, offset },
        data: items.map((r) => ({
            id: r.id,
            type: r.type,
            attributes: { ...r.attributes },
        })),
    };
}

function findIndex(id) {
    return store.findIndex((r) => r.id === String(id));
}

function handleApi(req, res, url) {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] !== "api" || parts[1] !== "products") {
        sendJson(res, 404, { errors: [{ title: "Not found" }] });
        return;
    }

    const id = parts[2];
    const method = req.method.toUpperCase();

    if (method === "GET" && !id) {
        sendJson(res, 200, listResources(url));
        return;
    }

    if (method === "GET" && id) {
        const idx = findIndex(id);
        if (idx < 0) {
            sendJson(res, 404, { errors: [{ title: "Product not found" }] });
            return;
        }
        sendJson(res, 200, itemDocument(store[idx]));
        return;
    }

    if (method === "POST" && !id) {
        readBody(req)
            .then((body) => {
                const incoming = parseJsonApiData(body);
                const items = Array.isArray(incoming) ? incoming : [incoming];
                const created = items.map((item) => {
                    const resource = {
                        id: item.id || randomId(),
                        type: item.type || RESOURCE_TYPE,
                        attributes: { ...item.attributes },
                    };
                    store.push(resource);
                    return resource;
                });
                if (created.length === 1) {
                    sendJson(res, 201, itemDocument(created[0]));
                } else {
                    sendJson(res, 201, {
                        data: created.map((r) => ({
                            id: r.id,
                            type: r.type,
                            attributes: { ...r.attributes },
                        })),
                    });
                }
            })
            .catch((err) => {
                sendJson(res, 400, { errors: [{ title: String(err.message) }] });
            });
        return;
    }

    if (method === "PATCH" && id) {
        readBody(req)
            .then((body) => {
                const idx = findIndex(id);
                if (idx < 0) {
                    sendJson(res, 404, { errors: [{ title: "Product not found" }] });
                    return;
                }
                const patch = parseJsonApiData(body);
                const existing = store[idx];
                const merged = {
                    ...existing,
                    type: patch.type || existing.type,
                    attributes: {
                        ...existing.attributes,
                        ...(patch.attributes || {}),
                    },
                };
                coerceAttributes(merged.attributes);
                store[idx] = merged;
                sendJson(res, 200, itemDocument(merged));
            })
            .catch((err) => {
                sendJson(res, 400, { errors: [{ title: String(err.message) }] });
            });
        return;
    }

    if (method === "DELETE" && id) {
        const idx = findIndex(id);
        if (idx < 0) {
            sendJson(res, 404, { errors: [{ title: "Product not found" }] });
            return;
        }
        store.splice(idx, 1);
        sendNoContent(res);
        return;
    }

    sendJson(res, 405, { errors: [{ title: "Method not allowed" }] });
}

function safePath(urlPath) {
    const decoded = decodeURIComponent(urlPath.split("?")[0]);
    if (decoded.includes("..")) {
        return null;
    }
    if (decoded === "/" || decoded === "") {
        return path.join(ROOT, "demo", "index.html");
    }
    const rel = decoded.replace(/^\//, "");
    const filePath = path.join(ROOT, rel);
    if (!filePath.startsWith(ROOT)) {
        return null;
    }
    return filePath;
}

function serveStatic(req, res, url) {
    let filePath = safePath(url.pathname);
    if (!filePath) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, "index.html");
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        res.writeHead(404);
        res.end("Not found");
        return;
    }

    const ext = path.extname(filePath);
    const type = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    fs.createReadStream(filePath).pipe(res);
}

loadSeed();

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (url.pathname.startsWith("/api/")) {
        handleApi(req, res, url);
        return;
    }

    serveStatic(req, res, url);
});

server.listen(PORT, () => {
    console.log(`KGrid demo: http://localhost:${PORT}/demo/`);
    console.log(`JSON:API:  http://localhost:${PORT}/api/products`);
    console.log("(in-memory store; restart resets data from demo/data/products.json)");
});
