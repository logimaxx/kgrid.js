/**
 * User preferences: column layout (order + hide) and filter values.
 * Layout is keyed by storageKey; filters also use filterStorageScope (e.g. company).
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

    CT.mergeLayoutIntoColumns = function (columns, layout) {
        const list = (columns || []).slice();
        list.forEach(function (col) {
            if (col && !col.hidden) {
                col.userHidden = false;
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

    CT.applyLayoutToDom = function ($table, columns, options) {
        if (!$table || !$table.length) {
            return;
        }
        const order = CT.chooserColumns(columns).map(function (col) {
            return col.name;
        });
        const hidden = {};
        CT.chooserColumns(columns).forEach(function (col) {
            if (col.userHidden) {
                hidden[col.name] = true;
            }
        });
        const $rows = $table.find(
            ".thead-labels tr, .thead-filters tr, .before-main-tbody tr, .main-tbody tr, .after-main-tbody tr"
        );
        $rows.each(function () {
            const $row = $(this);
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
        });
        const hasActions = $table.find(".kgrid-row-actions").length > 0;
        CT.syncActionColumnColgroup(
            $table,
            order.length,
            hasActions,
            options,
            CT.chooserColumns(columns)
        );
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
