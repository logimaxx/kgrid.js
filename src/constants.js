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
            "delete": false
        },
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
            events: []
        },
        filter: {
            type: "text",
            operator: "~=~",
            default: null,
            placeholder: "",
            options: null
        }
    };

    CT.VALID_NATIVE_INPUT_TYPES = ["displayonly","text","textarea","number","date","datetime","time","checkbox","radio","file","password","email","url","search","tel","select","hidden"];
    /** @deprecated use VALID_NATIVE_INPUT_TYPES or isValidInputType() */
    CT.VALID_INPUT_TYPES = CT.VALID_NATIVE_INPUT_TYPES.concat(["select2","autosuggest"]);
    CT.VALID_NATIVE_FILTER_TYPES = CT.VALID_NATIVE_INPUT_TYPES.filter((t) => t !== "displayonly");
    /** @deprecated use isValidFilterType() */
    CT.VALID_FILTER_TYPES = CT.VALID_NATIVE_FILTER_TYPES.concat(["select2","autosuggest","multi_select","date_range"]);

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
