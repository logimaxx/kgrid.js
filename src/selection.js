/**
 * Row selection. features.selection adds a leading checkbox column.
 * The header checkbox toggles every row on the current page.
 * Ids stay selected across filter, sort, and paging.
 */
(function (CT) {
    CT.SELECTION_COLUMN_NAME = "__select";

    CT.selectionEnabled = function (options) {
        return !!(options && options.features && options.features.selection);
    };

    CT.installSelectionColumn = function (options) {
        if (!CT.selectionEnabled(options)) {
            return options;
        }
        options.columns = options.columns || [];
        if (options.columns.some(function (col) { return col && col.selection; })) {
            return options;
        }
        const rowLabel = options.selectionRowLabel || "Select row";
        options.columns.unshift({
            name: CT.SELECTION_COLUMN_NAME,
            label: "",
            selection: true,
            locked: true,
            class: "kgrid-select",
            attrs: { width: 40 },
            features: { create: false, update: false, filter: false, sort: false },
            display: {
                template:
                    '<input type="checkbox" class="form-check-input kgrid-select-row" aria-label="' +
                    rowLabel +
                    '">',
                events: [],
            },
        });
        if (!options.selectedRows) {
            options.selectedRows = new Map();
        }
        return options;
    };

    CT.selectionId = function (item) {
        if (!item) {
            return "";
        }
        if (item.id != null && item.id !== "") {
            return String(item.id);
        }
        if (item.attributes && item.attributes.id != null && item.attributes.id !== "") {
            return String(item.attributes.id);
        }
        return "";
    };

    CT.selectionItem = function ($row) {
        if (!$row || !$row.length) {
            return null;
        }
        const direct = $row.data("instance");
        if (direct && (direct.id != null || direct.attributes)) {
            return direct;
        }
        const nested = $row.find("[data-type=item]").first().data("instance");
        return nested || null;
    };

    CT.visibleSelectionRows = function ($table) {
        return $table.find("tbody.main-tbody > tr").filter(function () {
            return $(this).find(".cell-content .kgrid-select-row").length > 0;
        });
    };

    CT.selectionRecord = function (options, item, $row) {
        const id = CT.selectionId(item);
        const record = { id: id };
        const metaFn = options.selection && options.selection.meta;
        if (typeof metaFn === "function") {
            const extra = metaFn(item, $row);
            if (extra && typeof extra === "object") {
                Object.keys(extra).forEach(function (key) {
                    if (key !== "id") {
                        record[key] = extra[key];
                    }
                });
            }
        }
        return record;
    };

    CT.selectionApply = function (options, $row, on, item) {
        const rowItem = item || CT.selectionItem($row);
        const id = CT.selectionId(rowItem);
        if (!id) {
            return;
        }
        const store = options.selectedRows;
        if (on) {
            store.set(id, CT.selectionRecord(options, rowItem, $row));
        } else {
            store.delete(id);
        }
        $row.find(".kgrid-select-row").prop("checked", !!on);
    };

    CT.paintSelectionToggle = function ($table) {
        const $rows = CT.visibleSelectionRows($table);
        let total = 0;
        let on = 0;
        $rows.each(function () {
            total += 1;
            if ($(this).find(".cell-content .kgrid-select-row").prop("checked")) {
                on += 1;
            }
        });
        $table.find(".kgrid-select-all").each(function () {
            this.checked = total > 0 && on === total;
            this.indeterminate = on > 0 && on < total;
        });
    };

    CT.syncSelectionDom = function (options, $table) {
        const store = options.selectedRows;
        CT.visibleSelectionRows($table).each(function () {
            const $row = $(this);
            const id = CT.selectionId(CT.selectionItem($row));
            $row.find(".kgrid-select-row").prop("checked", !!(id && store.has(id)));
        });
        CT.paintSelectionToggle($table);
    };

    CT.toggleSelection = function (options, $table, force) {
        const $rows = CT.visibleSelectionRows($table);
        let on = force;
        if (typeof on !== "boolean") {
            let total = 0;
            let checked = 0;
            $rows.each(function () {
                total += 1;
                if ($(this).find(".cell-content .kgrid-select-row").prop("checked")) {
                    checked += 1;
                }
            });
            on = !(total > 0 && checked === total);
        }
        $rows.each(function () {
            CT.selectionApply(options, $(this), on);
        });
        CT.paintSelectionToggle($table);
        return on;
    };

    CT.bindSelectionRow = function (item, view, table, options) {
        if (!CT.selectionEnabled(options) || !view || !view.el) {
            return;
        }
        const $row = view.el;
        const $table = $(table);
        $row.find(".kgrid-select-row").off("change.kgridSelect").on("change.kgridSelect", function () {
            CT.selectionApply(options, $row, this.checked, item);
            CT.paintSelectionToggle($table);
        });
        const id = CT.selectionId(item);
        const on = !!(id && options.selectedRows && options.selectedRows.has(id));
        $row.find(".kgrid-select-row").prop("checked", on);
        if (on) {
            options.selectedRows.set(id, CT.selectionRecord(options, item, $row));
        }
        CT.paintSelectionToggle($table);
    };

    CT.bindSelection = function (api, options, $table) {
        if (!options.selectedRows) {
            options.selectedRows = new Map();
        }
        api.selected = options.selectedRows;
        api.getSelection = function () {
            return Array.from(options.selectedRows.values());
        };
        api.clearSelection = function () {
            options.selectedRows.clear();
            CT.syncSelectionDom(options, $table);
            return api;
        };
        api.toggleAll = function (force) {
            CT.toggleSelection(options, $table, force);
            return api.getSelection();
        };
        api.syncSelection = function () {
            CT.syncSelectionDom(options, $table);
            return api;
        };
        $table.find(".kgrid-select-all").off("change.kgridSelect").on("change.kgridSelect", function () {
            CT.toggleSelection(options, $table, this.checked);
        });
        return api;
    };
})(window.KGrid);
