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

    CT.VALID_INPUT_TYPES = ["displayonly","text","textarea","number","date","datetime","time","checkbox","radio","file","password","email","url","search","tel","select","select2","autosuggest","hidden"];
    CT.VALID_FILTER_TYPES = ["displayonly","text","textarea","number","date","datetime","time","checkbox","radio","file","password","email","url","search","tel","select","select2","autosuggest","hidden"];
})(window.KGrid = window.KGrid || {});
