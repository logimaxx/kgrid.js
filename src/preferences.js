/**
 * User preferences: column layout (order + hide), filter values, sort, and paging.
 * Layout is keyed by storageKey. Filters, sort, and paging also use filterStorageScope.
 */
(function (CT) {
    CT.PREFERENCES_VERSION = 1;

    CT.localStoragePreferences = {
        get: function (key) {
            try {
                const root = typeof window !== "undefined" ? window : globalThis;
                const ls = root && root.localStorage;
                if (!ls) {
                    return null;
                }
                const raw = ls.getItem(key);
                return raw ? JSON.parse(raw) : null;
            } catch (err) {
                return null;
            }
        },
        set: function (key, value) {
            try {
                const root = typeof window !== "undefined" ? window : globalThis;
                const ls = root && root.localStorage;
                if (!ls) {
                    return;
                }
                if (value == null) {
                    ls.removeItem(key);
                    return;
                }
                ls.setItem(key, JSON.stringify(value));
            } catch (err) {
                /* quota / private mode */
            }
        },
    };

    CT.preferencesStorageFor = function (options) {
        if (options && options.preferencesStorage) {
            return options.preferencesStorage;
        }
        if (CT._config && CT._config.preferencesStorage) {
            return CT._config.preferencesStorage;
        }
        return CT.localStoragePreferences;
    };

    CT.layoutStorageKey = function (storageKey) {
        return "kgrid:" + storageKey + ":layout";
    };

    CT.filtersStorageKey = function (storageKey, scope) {
        let key = "kgrid:" + storageKey + ":filters";
        if (scope != null && String(scope) !== "") {
            key += ":" + String(scope);
        }
        return key;
    };

    CT.viewStorageKey = function (storageKey, scope) {
        let key = "kgrid:" + storageKey + ":view";
        if (scope != null && String(scope) !== "") {
            key += ":" + String(scope);
        }
        return key;
    };

    CT.chooserColumns = function (columns) {
        return (columns || []).filter(function (col) {
            return col && col.name && !col.hidden;
        });
    };

    CT.layoutFromColumns = function (columns) {
        return {
            v: CT.PREFERENCES_VERSION,
            columns: CT.chooserColumns(columns).map(function (col) {
                return { name: col.name, hidden: !!col.userHidden };
            }),
        };
    };

    CT.parseFilterExpression = function (part) {
        const s = String(part || "");
        const ops = ["~=~", ">=", "<=", "!=", "=", ">", "<"];
        for (let i = 0; i < ops.length; i++) {
            const op = ops[i];
            const idx = s.indexOf(op);
            if (idx > 0) {
                return {
                    name: s.slice(0, idx),
                    operator: op,
                    value: s.slice(idx + op.length),
                };
            }
        }
        return null;
    };

    CT.isUserFilterColumn = function (col) {
        return !!(
            col &&
            col.name &&
            !col.hidden &&
            (!col.features || col.features.filter !== false)
        );
    };

    CT.readUserFilters = function (form, columns) {
        if (!form) {
            return [];
        }
        const out = [];
        (columns || []).forEach(function (col) {
            if (!CT.isUserFilterColumn(col)) {
                return;
            }
            const $field = CT.filterFormField(form, col.name);
            if (!$field.length) {
                return;
            }
            const value = $field.val();
            if (value == null || value === "" || (Array.isArray(value) && !value.length)) {
                return;
            }
            const operator =
                $field.attr("data-operator") ||
                (col.filter && col.filter.operator) ||
                "~=~";
            out.push({
                name: col.name,
                value: Array.isArray(value) ? value : String(value),
                operator: operator,
            });
        });
        return out;
    };

    CT.applyUserFilters = function (form, columns, saved) {
        if (!form || !saved || !Array.isArray(saved.filters)) {
            return;
        }
        saved.filters.forEach(function (entry) {
            if (!entry || !entry.name) {
                return;
            }
            const col = (columns || []).find(function (c) {
                return c && c.name === entry.name;
            });
            if (!CT.isUserFilterColumn(col)) {
                return;
            }
            if (entry.value == null || entry.value === "") {
                return;
            }
            let $field = CT.filterFormField(form, entry.name);
            if (!$field.length) {
                CT.ensureFilterField(form, entry.name, entry.value, entry.operator);
                $field = CT.filterFormField(form, entry.name);
            }
            if (!$field.length) {
                return;
            }
            $field.val(entry.value);
            if (entry.operator) {
                $field.attr("data-operator", entry.operator);
            }
        });
    };

    /** Copy URL filter parts onto the form when the field is missing or empty. */
    CT.ensureUrlFiltersOnForm = function (form, collection) {
        if (!form || !collection || !collection.url || !collection.url.parameters) {
            return;
        }
        const urlFilter = String(collection.url.parameters.filter || "");
        if (!urlFilter) {
            return;
        }
        urlFilter.split(",").forEach(function (part) {
            const parsed = CT.parseFilterExpression(part.trim());
            if (!parsed || !parsed.name || parsed.value === "") {
                return;
            }
            const $existing = CT.filterFormField(form, parsed.name);
            if ($existing.length && $existing.val()) {
                return;
            }
            if ($existing.length) {
                $existing.val(parsed.value);
                $existing.attr("data-operator", parsed.operator);
                return;
            }
            CT.ensureFilterField(form, parsed.name, parsed.value, parsed.operator);
        });
    };

    CT.preferencesLoadLayout = function (options) {
        if (!options || !options.storageKey) {
            return null;
        }
        const stored = CT.preferencesStorageFor(options).get(
            CT.layoutStorageKey(options.storageKey)
        );
        if (!stored || stored.v !== CT.PREFERENCES_VERSION || !Array.isArray(stored.columns)) {
            return null;
        }
        return stored;
    };

    CT.preferencesSaveLayout = function (options, layout) {
        if (!options || !options.storageKey) {
            return;
        }
        CT.preferencesStorageFor(options).set(
            CT.layoutStorageKey(options.storageKey),
            layout
        );
    };

    CT.preferencesLoadFilters = function (options) {
        if (!options || !options.storageKey) {
            return null;
        }
        const stored = CT.preferencesStorageFor(options).get(
            CT.filtersStorageKey(options.storageKey, options.filterStorageScope)
        );
        if (!stored || stored.v !== CT.PREFERENCES_VERSION || !Array.isArray(stored.filters)) {
            return null;
        }
        return stored;
    };

    CT.preferencesSaveFilters = function (options, filters) {
        if (!options || !options.storageKey) {
            return;
        }
        CT.preferencesStorageFor(options).set(
            CT.filtersStorageKey(options.storageKey, options.filterStorageScope),
            { v: CT.PREFERENCES_VERSION, filters: filters || [] }
        );
    };

    CT.preferencesLoadView = function (options) {
        if (!options || !options.storageKey) {
            return null;
        }
        const stored = CT.preferencesStorageFor(options).get(
            CT.viewStorageKey(options.storageKey, options.filterStorageScope)
        );
        if (!stored || stored.v !== CT.PREFERENCES_VERSION || typeof stored !== "object") {
            return null;
        }
        return stored;
    };

    CT.preferencesSaveView = function (options, view) {
        if (!options || !options.storageKey) {
            return;
        }
        CT.preferencesStorageFor(options).set(
            CT.viewStorageKey(options.storageKey, options.filterStorageScope),
            view
        );
    };

    CT.sortableColumnNames = function (columns) {
        const names = new Set();
        (columns || []).forEach(function (col) {
            if (col && col.name && col.features && col.features.sort && !col.hidden) {
                names.add(col.name);
            }
        });
        return names;
    };

    /** Keep only sort tokens KViews can apply on the current sortable columns. */
    CT.sanitizeSort = function (sort, columns) {
        const allowed = CT.sortableColumnNames(columns);
        const parts = [];
        String(sort == null ? "" : sort)
            .split(",")
            .forEach(function (part) {
                const match = /^(-*)([A-Za-z0-9_-]+)$/.exec(String(part).trim());
                if (!match || !allowed.has(match[2])) {
                    return;
                }
                parts.push((match[1].length ? "-" : "") + match[2]);
            });
        return parts.join(",");
    };

    CT.collectionSort = function (instance) {
        const params = instance && instance.url && instance.url.parameters;
        if (!params || params.sort == null || params.sort === "") {
            return "";
        }
        return String(params.sort);
    };

    /** @returns {"asc"|"desc"|null} */
    CT.sortDirectionForField = function (sort, field) {
        const parts = String(sort || "").split(",");
        for (let i = 0; i < parts.length; i++) {
            const match = /^(-*)([A-Za-z0-9_-]+)$/.exec(parts[i].trim());
            if (!match || match[2] !== field) {
                continue;
            }
            return match[1].length ? "desc" : "asc";
        }
        return null;
    };

    /**
     * Header icons follow the sort string KViews will send.
     * sortdir matches KViews' click cycle: "up" = asc, "down" = desc, absent = unsorted.
     */
    CT.syncSortIndicators = function ($root, sort) {
        if (!$root || !$root.length) {
            return;
        }
        $root.find("[data-sortfld]").each(function () {
            const $lnk = $(this);
            const field = $lnk.attr("data-sortfld");
            const dir = CT.sortDirectionForField(sort, field);
            const $up = $lnk.find(".sort-up");
            const $down = $lnk.find(".sort-down");
            const $def = $lnk.find(".sort-default");
            if (dir === "asc") {
                $lnk.data("sortdir", "up");
                $up.show();
                $down.hide();
                $def.hide();
            } else if (dir === "desc") {
                $lnk.data("sortdir", "down");
                $up.hide();
                $down.show();
                $def.hide();
            } else {
                $lnk.removeData("sortdir");
                $up.hide();
                $down.hide();
                $def.show();
            }
        });
    };

    CT.applySavedPageSize = function ($footer, options, pageSize) {
        if (!$footer || !$footer.length || pageSize == null) {
            return false;
        }
        const size = String(pageSize);
        if (!/^\d+$/.test(size) || size === "0") {
            return false;
        }
        const allowed = (options.pagingPageSizes || []).map(function (n) {
            return String(n);
        });
        if (allowed.length && allowed.indexOf(size) < 0) {
            return false;
        }
        const $sel = $footer.find("select.pagesize");
        if (!$sel.length) {
            return false;
        }
        $sel.val(size);
        $footer.find(".pages").attr("data-pagesize", size);
        return true;
    };

    CT.applySavedOffset = function (instance, offset) {
        if (!instance || offset == null || !/^\d+$/.test(String(offset))) {
            return;
        }
        if (typeof instance.setOffset === "function") {
            instance.setOffset(String(offset));
            return;
        }
        instance.offset = String(offset);
    };

    CT.applySavedSort = function (instance, options, saved) {
        if (!saved || saved.sort == null || !options || !options.features || !options.features.sorting) {
            return;
        }
        const params = instance && instance.url && instance.url.parameters;
        if (!params) {
            return;
        }
        const sort = CT.sanitizeSort(saved.sort, options.columns);
        if (sort) {
            params.sort = sort;
        } else {
            delete params.sort;
        }
    };

    CT.persistViewState = function (instance, options, $table) {
        if (!options || !options.storageKey || !instance || !options.features) {
            return;
        }
        const sorting = !!options.features.sorting;
        const paging = !!options.features.paging;
        if (!sorting && !paging) {
            return;
        }
        const current = CT.preferencesLoadView(options) || {};
        const next = { v: CT.PREFERENCES_VERSION };
        if (sorting) {
            const params = instance.url && instance.url.parameters;
            if (params && Object.prototype.hasOwnProperty.call(params, "sort")) {
                next.sort = CT.sanitizeSort(params.sort, options.columns);
            } else if (typeof current.sort === "string") {
                next.sort = current.sort;
            } else {
                next.sort = "";
            }
        }
        if (paging) {
            const size = $table && $table.length ? $table.find("select.pagesize").val() : null;
            const allowed = (options.pagingPageSizes || []).map(function (n) {
                return String(n);
            });
            if (
                size != null &&
                /^\d+$/.test(String(size)) &&
                String(size) !== "0" &&
                (!allowed.length || allowed.indexOf(String(size)) >= 0)
            ) {
                next.pageSize = Number(size);
            } else if (current.pageSize != null) {
                next.pageSize = current.pageSize;
            }
            const offset = instance.offset != null ? String(instance.offset) : "0";
            next.offset = /^\d+$/.test(offset) ? Number(offset) : 0;
        }
        CT.preferencesSaveView(options, next);
    };

    CT.bindViewPersistence = function (instance, options, $table) {
        if (!instance || typeof instance.on !== "function") {
            return;
        }
        if (!options || !options.storageKey || !options.features) {
            return;
        }
        if (!options.features.sorting && !options.features.paging) {
            return;
        }
        instance.on("load", function () {
            CT.persistViewState(instance, options, $table);
            if (options.features.sorting) {
                CT.syncSortIndicators($table, CT.collectionSort(instance));
            }
        });
    };

    CT.reorderColumns = function (columns, orderedVisibleNames) {
        const byName = new Map();
        const schemaHidden = [];
        (columns || []).forEach(function (col, i) {
            if (col && col.hidden) {
                schemaHidden.push({ col: col, index: i });
                return;
            }
            if (col && col.name) {
                byName.set(col.name, col);
            }
        });
        const visible = [];
        (orderedVisibleNames || []).forEach(function (name) {
            if (byName.has(name)) {
                visible.push(byName.get(name));
                byName.delete(name);
            }
        });
        byName.forEach(function (col) {
            visible.push(col);
        });
        const result = visible.slice();
        schemaHidden.forEach(function (entry) {
            result.splice(Math.min(entry.index, result.length), 0, entry.col);
        });
        return result;
    };

    CT.columnDefaultUserHidden = function (col) {
        return !!(col && col.defaultHidden && !col.locked && !col.hidden);
    };

    CT.mergeLayoutIntoColumns = function (columns, layout) {
        const list = (columns || []).slice();
        list.forEach(function (col) {
            if (col && !col.hidden) {
                col.userHidden = CT.columnDefaultUserHidden(col);
            }
        });
        const visible = CT.chooserColumns(list);
        const byName = new Map(
            visible.map(function (col) {
                return [col.name, col];
            })
        );
        const orderedNames = [];
        const used = new Set();
        const saved = layout && Array.isArray(layout.columns) ? layout.columns : [];
        saved.forEach(function (entry) {
            if (!entry || !entry.name || !byName.has(entry.name)) {
                return;
            }
            const col = byName.get(entry.name);
            col.userHidden = !!entry.hidden && !col.locked;
            orderedNames.push(entry.name);
            used.add(entry.name);
        });
        visible.forEach(function (col) {
            if (!used.has(col.name)) {
                orderedNames.push(col.name);
            }
        });
        const merged = CT.reorderColumns(list, orderedNames);
        const chooser = CT.chooserColumns(merged);
        if (chooser.length && chooser.every(function (col) { return col.userHidden; })) {
            const unlock = chooser.find(function (col) { return !col.locked; }) || chooser[0];
            unlock.userHidden = false;
        }
        return merged;
    };

    CT.applyLayoutToRow = function ($row, columns) {
        if (!$row || !$row.length) {
            return;
        }
        const chooser = CT.chooserColumns(columns);
        const order = chooser.map(function (col) {
            return col.name;
        });
        const hidden = {};
        chooser.forEach(function (col) {
            if (col.userHidden) {
                hidden[col.name] = true;
            }
        });
        const $action = $row.children(".kgrid-row-actions");
        const byName = {};
        $row.children("[data-name]").each(function () {
            byName[this.getAttribute("data-name")] = this;
        });
        order.forEach(function (name) {
            const el = byName[name];
            if (!el) {
                return;
            }
            if ($action.length) {
                $(el).insertBefore($action);
            } else {
                $row.append(el);
            }
            el.classList.toggle("kgrid-user-hidden", !!hidden[name]);
        });
    };

    CT.applyLayoutToDom = function ($table, columns, options) {
        if (!$table || !$table.length) {
            return;
        }
        const $rows = $table.find(
            ".thead-labels tr, .thead-filters tr, .before-main-tbody tr, .main-tbody tr, .after-main-tbody tr"
        );
        $rows.each(function () {
            CT.applyLayoutToRow($(this), columns);
        });
        const visible = CT.layoutVisibleColumns(columns);
        const hasActions = $table.find(".kgrid-row-actions").length > 0;
        CT.syncActionColumnColgroup($table, visible.length, hasActions, options, visible);
        CT.syncSpanningCells($table, CT.participatingColumnCount(columns, hasActions));
    };

    CT.refreshCollectionTemplate = function (api, options) {
        if (!api || !api.instance || typeof CT.fillDataRow !== "function") {
            return;
        }
        const KViews = CT.getKViews(options && options.kviews);
        if (!KViews || typeof KViews.template !== "function") {
            return;
        }
        const $tr = $("<tr>");
        if (options.dataRowAttrs && CT.isPlainObject(options.dataRowAttrs)) {
            Object.keys(options.dataRowAttrs).forEach(function (attr) {
                $tr.attr(attr, options.dataRowAttrs[attr]);
            });
        }
        CT.fillDataRow($tr, options);
        const html = $("<div>").append($tr).html();
        const compiled = KViews.template(html);
        api.instance.template = compiled;
        (api.instance.items || []).forEach(function (item) {
            (item.views || []).forEach(function (view) {
                view.template = compiled;
            });
        });
    };

    CT.setupFilterPersistence = function (form, options) {
        if (!form || !options || !options.storageKey) {
            return;
        }
        if (!options.features || !options.features.filtering) {
            return;
        }
        $(form)
            .off("submit.kgridFilterPrefs")
            .on("submit.kgridFilterPrefs", function () {
                CT.preferencesSaveFilters(options, CT.readUserFilters(form, options.columns));
            });
    };

    CT.applyColumnLayout = function (api, options, layout) {
        options.columns = CT.mergeLayoutIntoColumns(options.columns, layout);
        const $table = api.$host.find("table").first();
        CT.applyLayoutToDom($table, options.columns, options);
        CT.refreshCollectionTemplate(api, options);
        if (typeof CT.renderColumnChooserPanel === "function") {
            const $panel = api.$host.find(".kgrid-column-chooser-panel");
            if ($panel.length) {
                CT.renderColumnChooserPanel($panel, options, api);
            }
        }
        return CT.layoutFromColumns(options.columns);
    };
})(window.KGrid);
