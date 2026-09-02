/**
 * Default table/column config prototypes and allowed input types.
 */
(function (CT) {
    CT.protoOptions = {
        "url": null,
        "type": null,
        filter: null,
        "features": {
            "filtering": false,
            "sorting": false,
            "paging": false,
            "create": false,
            "update": false,
            "delete": false,
            "clone": false,
            "columnChooser": false
        },
        /** Persist key for layout (and filters). Required for localStorage. */
        storageKey: null,
        /** Extra suffix for saved filters only (e.g. company id). Layout ignores this. */
        filterStorageScope: null,
        columnChooserLabel: "Columns",
        columnChooserResetLabel: "Reset columns",
        "defaultInteraction": "view",
        "insertFormRow": {
            "position": "top"
        },
        "tableAttrs": {
            "class": ""
        },
        "labelsRowAttrs": {

        },
        "dataRowAttrs": {

        },
        "filtersRowAttrs": null,
        /** Page size choices in paging footer <select> */
        pagingPageSizes: [10, 25, 50, 75],
        pagingDefaultSize: 10,
        /** Initial text in .no-data-tbody (overridden by noDataTemplate after init) */
        emptyRowMessage: null,
        pagingFooterLabel: "records per page. Total",
    };

    CT.protoColumnConfig = {
        label: null,
        name: null,
        hidden: false,
        /** When true, column chooser cannot hide this column (still reorderable). */
        locked: false,
        /** Runtime: user hid this column via chooser. Not a schema flag. */
        userHidden: false,
        /** CSS class(es) on header/filter/data/insert cells (alias: columnClass) */
        class: null,
        columnClass: null,
        attrs: {},
        features: {
            create: false,
            update: false,
            filter: false,
            sort: false
        },
        display: {
            template: null,
            events: []
        },
        /**
         * Shared insert+update defaults. Explicit insert/update win on conflict.
         * Example: input: { type: "number", required: true }
         */
        input: null,
        insert: {
            type: "text",
            default: null,
            value: null,
            placeholder: null,
            disabled: false,
            required: false,
            options: null,
            events: []
        },
        update: {
            type: "text",
            default: null,
            value: null,
            placeholder: null,
            disabled: false,
            required: false,
            options: null,
            template: null,
            events: []
        },
        filter: {
            type: "text",
            operator: "~=~",
            default: null,
            placeholder: "",
            options: null,
            /** Keep default across filter form reset / re-submit */
            persist: false,
            /** Override KGrid.configure({ filterDebounceMs }); 0 = submit immediately */
            debounceMs: null,
        }
    };

    CT.VALID_NATIVE_INPUT_TYPES = ["displayonly","text","textarea","number","date","datetime","time","checkbox","radio","file","password","email","url","search","tel","select","hidden"];
    /** @deprecated use VALID_NATIVE_INPUT_TYPES or isValidInputType() */
    CT.VALID_INPUT_TYPES = CT.VALID_NATIVE_INPUT_TYPES.slice();
    CT.VALID_NATIVE_FILTER_TYPES = CT.VALID_NATIVE_INPUT_TYPES.filter((t) => t !== "displayonly");
    /** @deprecated use isValidFilterType() */
    CT.VALID_FILTER_TYPES = CT.VALID_NATIVE_FILTER_TYPES.concat(["multi_select","date_range"]);

    CT.isValidInputType = function (type) {
        return CT.VALID_NATIVE_INPUT_TYPES.includes(type) || CT.isPluggableFieldType(type);
    };

    CT.isValidFilterType = function (type) {
        if (type === "displayonly") {
            return false;
        }
        return CT.VALID_NATIVE_FILTER_TYPES.includes(type) || CT.isPluggableFieldType(type);
    };
})(window.KGrid = window.KGrid || {});
