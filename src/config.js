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
})(window.KGrid);
