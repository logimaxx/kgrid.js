/**
 * dbAPI CSV export from the column chooser.
 * Full export keeps the collection query (filters, sort, include).
 * Visible export sends fields[type] for the columns on screen and drops include,
 * so related resources are not appended in full.
 */
(function (CT) {
    CT.csvExportFields = function (columns) {
        return CT.layoutVisibleColumns(columns)
            .filter(function (col) {
                return (
                    col &&
                    col.name &&
                    !col.selection &&
                    col.name !== CT.SELECTION_COLUMN_NAME &&
                    col.export !== false
                );
            })
            .map(function (col) {
                return typeof col.exportField === "string" && col.exportField
                    ? col.exportField
                    : col.name;
            });
    };

    /**
     * @param {string} href collection URL (relative or absolute)
     * @param {{ type: string, mode: "all"|"visible", fields?: string[], limit?: number }} spec
     * @returns {string} same shape as href (path+query, or absolute)
     */
    CT.buildCsvExportUrl = function (href, spec) {
        const parsed = new window.URL(href, "http://kgrid.local");
        const type = spec && spec.type;
        const limit = spec && spec.limit != null ? spec.limit : 10000;
        parsed.searchParams.set("format", "csv");
        parsed.searchParams.set("includetablehead", "true");
        if (type) {
            parsed.searchParams.set("page[" + type + "][limit]", String(limit));
            parsed.searchParams.set("page[" + type + "][offset]", "0");
        }
        const dropFields = [];
        parsed.searchParams.forEach(function (_value, key) {
            if (key.indexOf("fields[") === 0) {
                dropFields.push(key);
            }
        });
        dropFields.forEach(function (key) {
            parsed.searchParams.delete(key);
        });
        if (spec && spec.mode === "visible") {
            parsed.searchParams.delete("include");
            if (type && spec.fields && spec.fields.length) {
                parsed.searchParams.set("fields[" + type + "]", spec.fields.join(","));
            }
        }
        if (/^https?:\/\//i.test(href)) {
            return parsed.toString();
        }
        return parsed.pathname + parsed.search;
    };

    CT.resolveApiUrl = function (href, kviews) {
        if (href == null || href === "") {
            return href;
        }
        const s = String(href);
        if (/^https?:\/\//i.test(s) || s.startsWith("//")) {
            return s;
        }
        const base = (kviews && (kviews.baseUrl || kviews.basePath)) || "";
        if (!base) {
            return s;
        }
        const baseNorm = String(base).replace(/\/+$/, "");
        const pathNorm = s.replace(/^\/+/, "");
        return pathNorm ? baseNorm + "/" + pathNorm : baseNorm + "/";
    };

    function csvErrorMessage(response, data) {
        const err = data && data.errors && data.errors[0];
        const text = err && (err.detail || err.title || err.message);
        if (text) {
            return String(text);
        }
        if (data && data.error) {
            return String(data.error);
        }
        return "CSV export failed (" + response.status + ")";
    }

    CT.downloadCsv = function (options, api, mode) {
        const instance = api && api.instance;
        const href =
            instance && instance.url && instance.url.toString ? instance.url.toString() : "";
        if (!href) {
            return Promise.reject(new Error("CSV export requires a collection URL"));
        }
        const type = options && options.type;
        if (!type) {
            return Promise.reject(new Error("CSV export requires a resource type"));
        }
        const fields = mode === "visible" ? CT.csvExportFields(options.columns) : null;
        if (mode === "visible" && (!fields || !fields.length)) {
            return Promise.reject(new Error("No visible columns to export"));
        }
        const built = CT.buildCsvExportUrl(href, {
            type: type,
            mode: mode === "visible" ? "visible" : "all",
            fields: fields,
            limit: options.csvExportLimit,
        });
        const requestUrl = CT.resolveApiUrl(built, CT.getKViews(options.kviews));
        return window.fetch(requestUrl).then(function (response) {
            if (!response.ok) {
                return response
                    .json()
                    .catch(function () {
                        return null;
                    })
                    .then(function (data) {
                        throw new Error(csvErrorMessage(response, data));
                    });
            }
            return response.blob().then(function (blob) {
                const link = document.createElement("a");
                const objectUrl = window.URL.createObjectURL(blob);
                link.href = objectUrl;
                link.download = options.csvFileName || type + ".csv";
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(objectUrl);
            });
        });
    };
})(window.KGrid);
