(function (CT) {
    CT.init = async function (k, opts) {

        const table = k.$host.find("table");
        const options = {...CT.protoOptions,...opts};
        CT.log("table config options",options);

        const initialInteraction = CT.resolveDefaultInteraction(options);
        CT.applyInteraction(k.$host, initialInteraction);

        k.setInteraction = (mode, overrides) => {
            CT.applyInteraction(k.$host, mode, overrides);
            return k;
        };
        k.getInteraction = () => {
            const mode = CT.getTableInteractionHost(k.$host).attr("data-interaction");
            return mode === "edit" ? "edit" : "view";
        };
        /** @deprecated prefer setInteraction('edit'|'view'); boolean true = edit, false = view */
        k.setEditMode = (editMode) => {
            if (typeof editMode !== "boolean") {
                throw new TypeError("setEditMode(editMode) expects a boolean (true = edit, false = view)");
            }
            return k.setInteraction(editMode ? "edit" : "view");
        };
        /**
         * @deprecated prefer setInteraction('edit'|'view')
         * Boolean: true = edit, false = view.
         * Otherwise (no arg, or click handler Event): flip view ↔ edit.
         */
        k.toggleEditMode = (editMode) => {
            if (typeof editMode === "boolean") {
                return k.setInteraction(editMode ? "edit" : "view");
            }
            return k.setInteraction(k.getInteraction() === "edit" ? "view" : "edit");
        };
        options.columns = options.columns.map(col => CT.setDefaultValues(CT.protoColumnConfig, col));

        const handlers = options.handlers ?? {};
        delete options.handlers;
        options.columns.forEach(col=>{
            ['insert','update','display'].forEach(mode=>{
                const events = col[mode].events;
                if(!events || !Array.isArray(events)) {
                    throw new Error("Column "+col.name+" events are not an array");
                }
                events.forEach(event=>{
                    if(typeof event.callback==="string") {
                        const fn = handlers[event.callback] || (options.functions && options.functions[event.callback]);
                        if(!fn || typeof fn!=="function") {
                            throw new Error("Event callback function "+event.callback+" not found for column "+col.name+" or is not a function");
                        }
                        event.callback = fn;
                    } else if(typeof event.callback!=="function") {
                        throw new Error("Event callback must be a function for column "+col.name);
                    }
                });
            });
            const display = col.display;
            if(display && display.events && Array.isArray(display.events)) {
                display.events.forEach(event=>{
                    if(typeof event.callback==="string") {
                        const fn = handlers[event.callback] || (options.functions && options.functions[event.callback]);
                        if(fn && typeof fn==="function") {
                            event.callback = fn;
                        }
                    }
                });
            }
        });

        if(options.tableAttrs && options.tableAttrs.constructor===Object) {
            if(typeof options.tableAttrs.class==="string") {
                CT.log("options.tableAttrs.class",options.tableAttrs.class);
                table.addClass(options.tableAttrs.class);
                delete options.tableAttrs.class;
            }
            Object.keys(options.tableAttrs).forEach(att => table.attr(att,options.tableAttrs[att]));
        }

        const colMap = new Map();
        options.columns.forEach(col=>{
            colMap.set(col.name,col);
        });

        const labelsRow = CT.setupLabelsHeader(table.find(".thead-labels"),options);

        const visibleColumnsCount = labelsRow.find("th").length;

        const filterForm = options.filterForm ?? CT.setupFilterHeader(table,options);

        let pagingFooter;
        if(options.features && options.features.paging) {
            pagingFooter = CT.setupPagingFooter(table.find(".paging-footer"),options,visibleColumnsCount);
        }
        else {
            pagingFooter = null;
            table.find(".paging-footer").remove();
        }

        const noDataTbody = CT.setupNoDataTbody(table.find(".no-data-tbody"),options,visibleColumnsCount);

        if (options.features && options.features.create) {
            CT.setupNewRecordForm(table,options,k);
        }

        this.filterForm = new CT.FilterForm(filterForm);
        const dataBody = CT.setupDataBody(table.find(".main-tbody"),options,labelsRow,filterForm,pagingFooter,noDataTbody);

        let KViewOptions = {
            dontload: true,
            setAttrAsId: options.setAttrAsId ?? false,
            itemListeners: {"afterrender": (item)=>CT.setupEvents(item,k.find("table"),options,colMap)
            }
        };

        const KViews = window.KViews;
        if (!KViews) {
            throw new Error("KGrid requires KViews (load kviews before this script).");
        }
        k.instance = await KViews.createCollectionInstance(dataBody,KViewOptions);

        if(options.url) {
            k.instance.setUrl(options.url);
            if(options.deleteUrl) {
                CT.log("set deleteUrl",options.deleteUrl);
                k.instance.setUrl(options.deleteUrl,"delete");
            }
            if(options.updateUrl) {
                CT.log("set updateUrl",options.updateUrl);
                k.instance.setUrl(options.updateUrl,"update");
            }
            if(options.insertUrl) {
                k.instance.setUrl(options.insertUrl,"insert");
            }
            try {
                await k.instance.loadFromRemote();
            } catch (error) {
                CT.onError(error);
            }
        }
        else if(options.data && options.data.constructor===Array) {
            const dataCopy = options.data.map(item => ({ attributes: item }));
            k.instance.loadFromData(dataCopy);
        }
        else {
            throw new Error("Invalid data: missing datasource url or data for table");
        }
    };
})(window.KGrid);
