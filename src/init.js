(function (CT) {
    /**
     * Initialize a KGrid table inside a host element (DOM node or jQuery).
     * The host may be an empty element; KGrid builds the table DOM when none is present.
     *
     * @param {Element|JQuery} host
     * @param {Object} opts table configuration
     * @returns {Promise<KGridTable>} API: instance, filterForm, setInteraction, …
     */
    CT.init = async function (host, opts) {
        const $host = CT.resolveHostElement(host);
        const options = { ...CT.protoOptions, ...opts };
        const table = CT.mountTableShell($host, options);
        CT.log("table config options", options);

        const initialInteraction = CT.resolveDefaultInteraction(options);
        CT.applyInteraction($host, initialInteraction);

        const api = {
            $host,
            instance: null,
            filterForm: null,
            find(sel) {
                return $host.find(sel);
            },
            setInteraction(mode, overrides) {
                CT.applyInteraction($host, mode, overrides);
                return api;
            },
            getInteraction() {
                const mode = CT.getTableInteractionHost($host).attr("data-interaction");
                return mode === "edit" ? "edit" : "view";
            },
            /** @deprecated prefer setInteraction('edit'|'view') */
            setEditMode(editMode) {
                if (typeof editMode !== "boolean") {
                    throw new TypeError(
                        "setEditMode(editMode) expects a boolean (true = edit, false = view)"
                    );
                }
                return api.setInteraction(editMode ? "edit" : "view");
            },
            /**
             * @deprecated prefer setInteraction('edit'|'view')
             * Boolean: true = edit, false = view. No arg / Event: toggle.
             */
            toggleEditMode(editMode) {
                if (
                    editMode != null &&
                    typeof editMode === "object" &&
                    typeof editMode.preventDefault === "function"
                ) {
                    editMode = undefined;
                }
                if (typeof editMode === "boolean") {
                    return api.setInteraction(editMode ? "edit" : "view");
                }
                return api.setInteraction(api.getInteraction() === "edit" ? "view" : "edit");
            },
        };

        options.columns = options.columns.map((col) =>
            CT.setDefaultValues(CT.protoColumnConfig, col)
        );

        const handlers = options.handlers ?? {};
        delete options.handlers;
        options.columns.forEach((col) => {
            ["insert", "update", "display"].forEach((mode) => {
                const events = col[mode].events;
                if (!events || !Array.isArray(events)) {
                    throw new Error("Column " + col.name + " events are not an array");
                }
                events.forEach((event) => {
                    if (typeof event.callback === "string") {
                        const fn =
                            handlers[event.callback] ||
                            (options.functions && options.functions[event.callback]);
                        if (!fn || typeof fn !== "function") {
                            throw new Error(
                                "Event callback function " +
                                    event.callback +
                                    " not found for column " +
                                    col.name +
                                    " or is not a function"
                            );
                        }
                        event.callback = fn;
                    } else if (typeof event.callback !== "function") {
                        throw new Error(
                            "Event callback must be a function for column " + col.name
                        );
                    }
                });
            });
            const display = col.display;
            if (display && display.events && Array.isArray(display.events)) {
                display.events.forEach((event) => {
                    if (typeof event.callback === "string") {
                        const fn =
                            handlers[event.callback] ||
                            (options.functions && options.functions[event.callback]);
                        if (fn && typeof fn === "function") {
                            event.callback = fn;
                        }
                    }
                });
            }
        });

        const colMap = new Map();
        options.columns.forEach((col) => {
            colMap.set(col.name, col);
        });

        const labelsRow = CT.setupLabelsHeader(table.find(".thead-labels"), options);

        const hasActionColumn = CT.hasActionColumn(options);
        const visibleColumnsCount = labelsRow.find("th").length;
        const dataColumnCount = visibleColumnsCount - (hasActionColumn ? 1 : 0);
        CT.syncActionColumnColgroup(table, dataColumnCount, hasActionColumn);

        const filterForm = options.filterForm ?? CT.setupFilterHeader(table, options);

        let pagingFooter;
        if (options.features && options.features.paging) {
            pagingFooter = CT.setupPagingFooter(
                table.find(".paging-footer"),
                options,
                visibleColumnsCount
            );
        } else {
            pagingFooter = null;
            table.find(".paging-footer").remove();
        }

        const noDataTbody = CT.setupNoDataTbody(
            table.find(".no-data-tbody"),
            options,
            visibleColumnsCount
        );

        if (options.features && options.features.create) {
            CT.setupNewRecordForm(table, options, api);
        }

        api.filterForm = new CT.FilterForm(filterForm);
        const dataBody = CT.setupDataBody(
            table.find(".main-tbody"),
            options,
            labelsRow,
            filterForm,
            pagingFooter,
            noDataTbody
        );

        const KViewOptions = {
            dontload: true,
            setAttrAsId: options.setAttrAsId ?? false,
            itemListeners: {
                afterrender: (item) =>
                    CT.setupEvents(item, api.find("table"), options, colMap),
            },
        };

        const KViews = CT.getKViews(options.kviews);
        if (!KViews) {
            throw new Error(CT.KVIEWS_MISSING_MSG);
        }
        api.instance = await KViews.createCollectionInstance(dataBody, KViewOptions);

        if (options.url) {
            api.instance.setUrl(options.url);
            if (options.deleteUrl) {
                CT.log("set deleteUrl", options.deleteUrl);
                api.instance.setUrl(options.deleteUrl, "delete");
            }
            if (options.updateUrl) {
                CT.log("set updateUrl", options.updateUrl);
                api.instance.setUrl(options.updateUrl, "update");
            }
            if (options.insertUrl) {
                api.instance.setUrl(options.insertUrl, "insert");
            }
            try {
                await api.instance.loadFromRemote();
            } catch (error) {
                CT.onError(error);
            }
        } else if (options.data && options.data.constructor === Array) {
            const dataCopy = options.data.map((item) => ({ attributes: item }));
            api.instance.loadFromData(dataCopy);
        } else {
            throw new Error("Invalid data: missing datasource url or data for table");
        }

        return api;
    };
})(window.KGrid);
