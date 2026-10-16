(function (CT) {
    /** Plain object (not array / null) — realm-safe vs `constructor === Object`. */
    CT.isPlainObject = function (value) {
        return value != null && typeof value === "object" && !Array.isArray(value);
    };

    CT.setDefaultValues = function (proto, col) {
        const newCol = { ...(proto || {}) };
        Object.keys(col || {}).forEach((key) => {
            if (CT.isPlainObject(col[key]) && CT.isPlainObject(newCol[key])) {
                newCol[key] = CT.setDefaultValues(newCol[key], col[key]);
                return;
            }
            if (CT.isPlainObject(col[key]) && newCol[key] == null) {
                newCol[key] = CT.setDefaultValues({}, col[key]);
                return;
            }
            newCol[key] = col[key];
        });
        return newCol;
    };

    /**
     * Normalize a column: expand `input` shorthand, merge proto, ensure events[].
     * @param {Object} col raw column from table options
     * @returns {Object}
     */
    CT.normalizeColumnConfig = function (col) {
        let partial = col && typeof col === "object" ? { ...col } : {};
        if (CT.isPlainObject(partial.input)) {
            const shared = { ...partial.input };
            delete partial.input;
            partial.insert = CT.setDefaultValues(shared, partial.insert || {});
            partial.update = CT.setDefaultValues(shared, partial.update || {});
        }
        const merged = CT.setDefaultValues(CT.protoColumnConfig, partial);
        if (merged.class == null && merged.columnClass) {
            merged.class = merged.columnClass;
        }
        if (
            merged.update &&
            merged.update.type === "displayonly" &&
            !merged.update.template &&
            merged.display &&
            merged.display.template
        ) {
            merged.update.template = merged.display.template;
        }
        ["display", "insert", "update"].forEach((mode) => {
            if (!merged[mode] || typeof merged[mode] !== "object") {
                return;
            }
            if (!Array.isArray(merged[mode].events)) {
                merged[mode].events = [];
            }
        });
        return merged;
    };

    const ON_DUPLICATE_ACTIONS = ["error", "ignore", "update"];
    const ON_DUPLICATE_OPS = ["set", "add", "sub"];

    function onDuplicateField(name, op) {
        const field = String(name || "").trim();
        const operator = op == null || op === "" ? "set" : String(op).trim();
        if (!/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?$/.test(field)) {
            throw new Error("Invalid onDuplicate field: " + name);
        }
        if (ON_DUPLICATE_OPS.indexOf(operator) === -1) {
            throw new Error("Invalid onDuplicate operator '" + operator + "' on field '" + field + "'");
        }
        return { name: field, op: operator };
    }

    function onDuplicateToken(token) {
        const raw = String(token || "").trim();
        const colon = raw.lastIndexOf(":");
        if (colon === -1) {
            return onDuplicateField(raw, "set");
        }
        return onDuplicateField(raw.slice(0, colon), raw.slice(colon + 1));
    }

    /**
     * Query params for dbAPI `onduplicate` / `update` (field, field:add, field:sub).
     * @param {string|{action?: string, onduplicate?: string, fields?: object|string|string[]}|null} spec
     * @returns {{onduplicate: string, update?: string}|null}
     */
    CT.onDuplicateParams = function (spec) {
        if (spec == null || spec === false) {
            return null;
        }
        let action;
        let fields;
        if (typeof spec === "string") {
            action = spec.trim();
        } else if (CT.isPlainObject(spec)) {
            action = String(spec.action || spec.onduplicate || "").trim();
            fields = spec.fields != null ? spec.fields : spec.update;
        } else {
            throw new Error("onDuplicate must be a string or an object");
        }
        if (ON_DUPLICATE_ACTIONS.indexOf(action) === -1) {
            throw new Error("Invalid onDuplicate action: " + action);
        }
        const params = { onduplicate: action };
        if (action !== "update") {
            return params;
        }
        const list = [];
        const seen = {};
        const push = function (entry) {
            if (seen[entry.name]) {
                throw new Error("onDuplicate field '" + entry.name + "' is listed more than once");
            }
            seen[entry.name] = true;
            list.push(entry.op === "set" ? entry.name : entry.name + ":" + entry.op);
        };
        if (typeof fields === "string") {
            fields.split(",").forEach(function (token) {
                if (token.trim()) push(onDuplicateToken(token));
            });
        } else if (Array.isArray(fields)) {
            fields.forEach(function (token) {
                push(onDuplicateToken(token));
            });
        } else if (CT.isPlainObject(fields)) {
            Object.keys(fields).forEach(function (name) {
                push(onDuplicateField(name, fields[name]));
            });
        } else if (fields != null) {
            throw new Error("onDuplicate fields must be an object, array, or string");
        }
        if (!list.length) {
            throw new Error("onDuplicate action 'update' requires fields");
        }
        params.update = list.join(",");
        return params;
    };

    /**
     * Copy a collection URL and set onduplicate/update for the insert POST only.
     * Existing query params are kept. A previous onduplicate/update pair is replaced.
     * @param {string} url
     * @param {string|object|null} spec
     * @returns {string}
     */
    CT.applyOnDuplicateToUrl = function (url, spec) {
        const extra = CT.onDuplicateParams(spec);
        if (!extra || !url) {
            return url;
        }
        const hashAt = url.indexOf("#");
        const hash = hashAt >= 0 ? url.slice(hashAt) : "";
        const bare = hashAt >= 0 ? url.slice(0, hashAt) : url;
        const qAt = bare.indexOf("?");
        const path = qAt >= 0 ? bare.slice(0, qAt) : bare;
        const pairs = [];
        if (qAt >= 0) {
            bare.slice(qAt + 1).split("&").forEach(function (part) {
                if (!part) return;
                const eq = part.indexOf("=");
                const key = decodeURIComponent(eq >= 0 ? part.slice(0, eq) : part);
                if (key === "onduplicate" || key === "update") return;
                pairs.push(part);
            });
        }
        Object.keys(extra).forEach(function (key) {
            pairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(extra[key]));
        });
        return path + (pairs.length ? "?" + pairs.join("&") : "") + hash;
    };
})(window.KGrid);
