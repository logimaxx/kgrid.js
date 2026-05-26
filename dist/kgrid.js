/*! kgrid | built 2026-05-26T10:19:33.315Z */

/* --- configure.js --- */
/**
 * Host-app integration: call KGrid.configure({ ... }) before mounting tables.
 */
(function (CT) {
    const defaultConfig = {
        log: function () {},
        onError: function (err) {
            console.error(err);
        },
        confirm: function (message, onConfirm, onCancel) {
            if (typeof window !== "undefined" && window.confirm(message)) {
                onConfirm();
            } else if (onCancel) {
                onCancel();
            }
        },
        serializeForm: function (form, columns) {
            const fd = new FormData(form);
            const out = {};
            for (const [key, value] of fd.entries()) {
                if (Object.prototype.hasOwnProperty.call(out, key)) {
                    if (!Array.isArray(out[key])) {
                        out[key] = [out[key]];
                    }
                    out[key].push(value);
                } else {
                    out[key] = value;
                }
            }
            return out;
        },
        select2: null,
        autosuggest: function ($input, options) {
            const $el = typeof $input === "object" && $input.jquery ? $input : window.jQuery($input);
            if (typeof $el.autosuggest === "function") {
                return $el.autosuggest(options);
            }
            throw new Error("KGrid: jQuery autosuggest plugin is not loaded");
        },
    };

    CT._config = Object.assign({}, defaultConfig);

    /**
     * @param {Object} overrides
     * @param {Function} [overrides.log]
     * @param {Function} [overrides.onError]
     * @param {Function} [overrides.confirm] (message, onConfirm, onCancel?)
     * @param {Function} [overrides.serializeForm] (form, columns?)
     * @param {Function} [overrides.select2] ($input, options)
     * @param {Function} [overrides.autosuggest] ($input, options)
     */
    CT.configure = function (overrides) {
        if (overrides && typeof overrides === "object") {
            Object.assign(CT._config, overrides);
        }
        return CT;
    };

    CT.log = function () {
        CT._config.log.apply(null, arguments);
    };

    CT.onError = function (err) {
        return CT._config.onError(err);
    };

    CT.confirm = function (message, onConfirm, onCancel) {
        return CT._config.confirm(message, onConfirm, onCancel);
    };

    CT.serializeForm = function (form, columns) {
        return CT._config.serializeForm(form, columns);
    };

    CT.wrapSelect2 = function ($input, options) {
        if (typeof CT._config.select2 !== "function") {
            throw new Error("KGrid.configure({ select2: fn }) is required for select2 columns");
        }
        return CT._config.select2($input, options);
    };

    CT.autosuggest = function ($input, options) {
        return CT._config.autosuggest($input, options);
    };
})(window.KGrid = window.KGrid || {});


/* --- constants.js --- */
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


/* --- config.js --- */
(function (CT) {
    CT.setDefaultValues = function (proto, col) {
        const newCol = {...proto};
        Object.keys(col).forEach(key => {
            if(col[key] && col[key].constructor === Object) {
                newCol[key] = CT.setDefaultValues(newCol[key], col[key]);
                return;
            }
            newCol[key] = col[key];
        });
        return newCol;
    };
})(window.KGrid);


/* --- dom.js --- */
(function (CT) {
    CT.uuid = function () {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    };

    /**
     * Place a hidden <form> anchor on a table row template.
     * Row controls use form="id" (cannot wrap <tr> in one <form>).
     */
    CT.anchorRowForm = function ($form, $row) {
        if (!$form || !$form.length || !$row || !$row.length) {
            return $form;
        }
        $form.attr("hidden", "hidden").attr("aria-hidden", "true");
        const $firstTd = $row.children("td").first();
        if ($firstTd.length) {
            $form.prependTo($firstTd);
        }
        return $form;
    };

    /** Field in filter row (associated via form="" on control, not nested inside <form>). */
    CT.filterFormField = function (formEl, name) {
        if (!formEl || !name) {
            return $();
        }
        const el = formEl.elements && formEl.elements.namedItem(name);
        if (el) {
            return $(el);
        }
        if (formEl.id) {
            const associated = document.querySelector(`[form="${formEl.id}"][name="${name}"]`);
            if (associated) {
                return $(associated);
            }
        }
        return $();
    };
})(window.KGrid);


/* --- select2.js --- */
(function (CT) {
    /** select2wrapper options: AJAX config + default from <option> or config default spec. */
    CT.select2OptionsWithDefault = function ($select, optionsConfig, defaultSpec) {
        const opts = { ...(optionsConfig || {}) };
        const $sel = $select.find("option:selected");
        if ($sel.length && String($sel.val() ?? "") !== "") {
            opts.default = { value: $sel.val(), label: $sel.text() };
        } else if (defaultSpec && typeof defaultSpec === "object" && defaultSpec.value != null) {
            opts.default = defaultSpec;
        } else if (defaultSpec != null && defaultSpec !== "" && typeof defaultSpec !== "object") {
            opts.default = { value: String(defaultSpec), label: String(defaultSpec) };
        }
        return opts;
    };

    CT.assertSelect2Options = function (options, context) {
        if (!options?.url || !options?.idFld || !options?.labelFld) {
            throw new Error("Invalid select2 config (" + context + "): " + JSON.stringify(options, null, 2));
        }
    };

    CT.initSelect2OnField = function ($input, wrapperOptions, context) {
        CT.assertSelect2Options(wrapperOptions, context);
        const $inp = $($input);
        if ($inp.data("select2")) {
            $inp.select2("destroy");
        }
        CT.wrapSelect2($inp, wrapperOptions);
    };

    CT.select2OptionsForUpdate = function ($select, updateConfig) {
        return CT.select2OptionsWithDefault($select, updateConfig.options, updateConfig.value);
    };

    CT.initUpdateSelect2 = function ($input, updateConfig) {
        CT.initSelect2OnField($input, CT.select2OptionsForUpdate($($input), updateConfig), "update");
    };

    CT.select2OptionsForFilter = function ($select, filter) {
        return CT.select2OptionsWithDefault($select, filter.options, filter.default);
    };

    CT.initFilterSelect2 = function ($input, filter) {
        CT.initSelect2OnField($input, CT.select2OptionsForFilter($($input), filter), "filter");
    };
})(window.KGrid);


/* --- interaction.js --- */
(function (CT) {
    /** @returns {"view"|"edit"} */
    CT.resolveDefaultInteraction = function (options) {
        if (options.defaultInteraction === "edit" || options.defaultInteraction === "view") {
            return options.defaultInteraction;
        }
        if (options.editmode === true) {
            return "edit";
        }
        if (options.editmode === false) {
            return "view";
        }
        return "view";
    };

    /** Host element that owns interaction CSS (.custom-table-shell). */
    CT.getTableInteractionHost = function ($host) {
        if ($host.hasClass("custom-table-shell")) {
            return $host;
        }
        const $shell = $host.find(".custom-table-shell").first();
        return $shell.length ? $shell : $host;
    };

    CT.applyInteraction = function ($host, mode, overrides) {
        const $shell = CT.getTableInteractionHost($host);
        const interaction = mode === "edit" ? "edit" : "view";
        $shell.attr("data-interaction", interaction);
        if (overrides && typeof overrides === "object") {
            if (overrides.create !== undefined) {
                $shell.attr("data-allow-insert", overrides.create ? "true" : "false");
            }
            if (overrides.update !== undefined) {
                $shell.attr("data-allow-update", overrides.update ? "true" : "false");
            }
            if (overrides.delete !== undefined) {
                $shell.attr("data-allow-delete", overrides.delete ? "true" : "false");
            }
        } else if (interaction === "edit") {
            $shell.removeAttr("data-allow-insert data-allow-update data-allow-delete");
        }
    };
})(window.KGrid);


/* --- labels.js --- */
(function (CT) {
    /**
     * Setup labels row
     * @returns {jQuery}
     */
    CT.setupLabelsHeader = function (labelsThead, options) {
        const labelsRow = labelsThead.children("tr");

        const existingTh = labelsRow.children();
        const labelTemplate = existingTh.first().clone(true);
        existingTh.remove();
        const columns = [...options.columns];
        columns.forEach(col => {
            if(col.hidden) {
                return;
            }

            let cell = labelTemplate.clone(true);
            if(col.attrs && typeof col.attrs === 'object') {
                Object.keys(col.attrs).forEach(attr => cell.attr(attr, col.attrs[attr]));
            }

            if(!col.features?.sort) {
                const tmp = cell.empty().html(col.label  ?? "");
                labelsRow.append(tmp);
                return;
            }
            if(!col.name) {
                throw new Error("Column must have a name when column.sortable is true: \n"+JSON.stringify(col,null,2));
            }
            cell.find("span.column-label").text(col.label ?? "");
            cell.children("a").attr("data-sortfld",col.name);
            cell.appendTo(labelsRow);
        });
        if(options.features && (options.features.delete || options.features.create)) {
            $("<th width='100px'>").appendTo(labelsRow);
        }

        return labelsRow;
    };
})(window.KGrid);


/* --- filters.js --- */
(function (CT) {
    /**
     * Setup filtering row.
     * Filter inputs live in <th> cells; they cannot sit inside one <form> in a <tr>.
     * Each control uses the HTML form="" attribute pointing at a hidden <form id="…"> (see setupFilterHeader).
     * @returns {jQuery|null} hidden filter form element (for FilterForm / KViews)
     */
    CT.setupFilterHeader = function (table, options) {
        if(!options.features || !options.features.filtering) {
            return null;
        }
        const theadFilters = table.find(".thead-filters");
        theadFilters.empty();

        const columns = [...options.columns];
        const filtersRow = $("<tr>");
        filtersRow.appendTo(theadFilters);
        const filterFormId = "filter_form_"+CT.uuid();
        const filterForm = $("<form>")
            .attr("id", filterFormId)
            .attr("hidden", "hidden")
            .attr("aria-hidden", "true")
            .addClass("table-filter-form")
            .insertBefore(table);

        columns.forEach(col => {
            if(col.hidden) {
                return;
            }

            let filterCell =  $("<th>").appendTo(filtersRow).attr("data-label", col.label);

            if(col.features.filter===false) {
                return;
            }
            if(!col.name) {
                throw new Error("Column must have a name when column.features.filter is true: \n"+JSON.stringify(col,null,2));
            }

            let filter = col.filter;
            let input;
            let initFilterWidget = null;
            switch(filter.type) {
                case "select":
                    if(!filter.options) {
                        throw new Error("Column must have a filter.options array when column.filter.type is select: \n"+JSON.stringify(col,null,2));
                    }
                    input = $(`<select>`).addClass("form-select form-select-sm");
                    if(Array.isArray(filter.options)) {
                        filter.options.forEach((opt)=> {
                            if(!opt.label || typeof opt.value!=="string") {
                                throw new Error("Column must have an filter.options object with label and value when column.filter.type is select: \n"+JSON.stringify(col,null,2));
                            }
                            $("<option>").text(opt.label).attr("value",opt.value).appendTo(input);
                        });
                    }
                    else {
                        throw new Error("Column must have an filter.options array when column.filter.type is select: \n"+JSON.stringify(col,null,2));
                    }
                    break;
                case "multi_select":
                    input = $(`<select class='form-select form-select-sm' multiple>`);
                    if(Array.isArray(filter.options)) {
                        filter.options.forEach((opt)=> $("<option>").text(opt.label).attr("value",opt.value).appendTo(input));
                    }
                    break;
                case "autosuggest":
                    input = $(`<input autocomplete='off' type='text' class='form-control form-control-sm'/>`);
                    initFilterWidget = (inp) => { CT.autosuggest(inp, filter.options); };
                    break;
                case "date_range":
                    input = $(`<input autocomplete='off' type='date' class='form-control form-control-sm' />`);
                    break;
                case "select2":
                    input = $(`<select class='form-select form-select-sm select2' data-type='select2'/>`);
                    if(col.filter.default && typeof col.filter.default === "object" && col.filter.default.value) {
                        $("<option>").text(col.filter.default.label??col.filter.default.value).attr("value",col.filter.default.value).appendTo(input);
                    }
                    initFilterWidget = (inp) => CT.initFilterSelect2(inp, filter);
                    break;
                default:
                    input = $(`<input autocomplete='off' type='${filter.type}' class='form-control form-control-sm'/>`);
            }

            input.appendTo(filterCell);
            if (initFilterWidget) {
                initFilterWidget(input);
            }

            input.attr("data-operator", filter.operator);
            input.attr("form",filterFormId);
            input.attr("name",col.name);
            const submitFilterForm = function() {
                const form = this.form;
                if (form) {
                    $(form).trigger("submit");
                }
            };
            input.on("input change", submitFilterForm);
            if (filter.type === "select2") {
                input.on("select2:select select2:clear", submitFilterForm);
            }
        });


        if(options.features && (options.features.delete || options.features.update || options.features.create)) {
            $("<th>").appendTo(filtersRow).attr("data-label", "Actions");
        }

        return filterForm;
    };

    CT.FilterForm = function (form) {
        this.form = $(form)[0];
        this.filter = (name,value,operator="~=~") => {
            if(!this.form) return this;
            const $field = CT.filterFormField(this.form, name);
            if(!$field.length) return this;
            $field.val(value);
            const oldOperator = $field.attr("data-operator");
            $field.attr("data-operator", operator);
            $(this.form).trigger("submit");
            $field.attr("data-operator", oldOperator);
            return this;
        };
        this.reset = () => {
            if (this.form) {
                this.form.reset();
            }
            return this;
        };
    };
})(window.KGrid);


/* --- cells.js --- */
(function (CT) {
    /**
     * Setup data cell
     * @param {Object} col
     * @param {jQuery} editForm hidden anchor form (fields use form="id")
     * @returns {jQuery}
     */
    CT.setupCell = function (col, editForm) {

        const formId = editForm ? editForm.attr("id") : null;

        const c = {...col };
        const $cell = $("<td>").attr("data-label", col.label);

        const attrs = (c.attrs && typeof c.attrs==="object") ? c.attrs : {};
        Object.keys(attrs).forEach(attr => $cell.attr(attr, attrs[attr]));

        let cellContent = $("<div>").addClass("cell-content");
        cellContent.html(c.display.template ?? `{{${c.name}}}`);
        cellContent.appendTo($cell);

        if (editForm==null ||  !col.features.update) {
            cellContent.clone(true).removeClass('cell-content').addClass('cell-input').appendTo($cell);
            return $cell;
        }

        if(!c.name) {
            throw new Error("Column must have a name when column.features.update is true: \n"+JSON.stringify(col,null,2));
        }

        const updateConfig = c.update;

        let input;
        switch(updateConfig.type ?? "text") {
            case "textarea":
                input = $(`<textarea class='form-input form-control form-control-sm'>{{${updateConfig.value??c.name}}}</textarea>`);
                break;
            case "autosuggest":
                input = $(`<input autocomplete='off' type='text' class='form-input form-control form-control-sm' data-type='autosuggest'/>`);
                break;
            case "select2":
                input = $(`<select class='form-input form-select form-select-sm select2' data-type='select2'/>`);
                if(c.update.value && typeof c.update.value === "object" && c.update.value.value) {
                    $("<option selected>").text(c.update.value.label??c.update.value.value).attr("value",c.update.value.value).appendTo(input);
                }
                break;
            case "select":
                input = $(`<select class='form-input form-control form-control-sm'/>`);
                if(!Array.isArray(updateConfig.options)) {
                    throw new Error("Select column must have an update.options array when column.features.update is true: \n"+JSON.stringify(col,null,2));
                }
                const selOptions = [];
                updateConfig.options.forEach((opt)=> selOptions.push(
                    "{{#if (eq "+c.name+" '"+opt.value+"')}}<option value='"+opt.value+"' selected>"+opt.label+"</option>{{else}}"+
                    "<option value='"+opt.value+"'>"+opt.label+"</option>{{/if}}"
                ));
                CT.log("selOptions",selOptions);
                input.html(selOptions.join(""));
                break;
            case "hidden":
                input = $(`<input type='hidden' class='form-input form-control form-control-sm'/>`);
                break;
            case "displayonly":
                $("<div>").addClass("cell-input").append(c.display.template ?? `{{${c.name}}}`).appendTo($cell);
                return $cell;
            default:
                if(CT.VALID_FILTER_TYPES.includes(updateConfig.type)) {
                    input = $(`<input autocomplete='off' type='${updateConfig.type}' class='form-input form-control form-control-sm'/>`);
                } else {
                    throw new Error("Invalid update updateConfig type: "+JSON.stringify(updateConfig,null,2));
                }
        }


        if(updateConfig.attrs && typeof updateConfig.attrs === 'object') {
            Object.keys(updateConfig.attrs).forEach(k => input.attr(k, updateConfig.attrs[k]));
        }

        input.attr("form",formId);
        input.attr("name",c.name);
        const updateType = updateConfig.type ?? "text";
        if (updateType !== "select" && updateType !== "select2" && updateType !== "textarea") {
            const rawValue = updateConfig.value ?? `{{${c.name}}}`;
            if (rawValue != null && typeof rawValue !== "object") {
                input.attr("value", rawValue);
            }
        }
        input.attr("data-type", updateType);

        if(c.hidden) {
            input.attr("type","hidden").appendTo(editForm);
            return $cell;
        }


        if(updateConfig.disabled) input.attr("disabled",true);
        if(updateConfig.readonly) input.attr("readonly",true);
        if(updateConfig.required) input.attr("required",true);

        if(updateConfig.attrs && typeof updateConfig.attrs === 'object') {
            Object.keys(updateConfig.attrs).forEach(k => input.attr(k, updateConfig.attrs[k]));
        }
        if(!updateConfig.disabled && !updateConfig.readonly)
            input.attr("onchange","$(this).parents('tr').addClass('editing')");

        $("<div>").addClass("cell-input").append(input).appendTo($cell);
        return $cell;
    };
})(window.KGrid);


/* --- data-body.js --- */
(function (CT) {
    CT.setupNoDataTbody = function (noDataTbody, options, noVisibleCols) {
        const td = noDataTbody.find("td")
            .attr("colspan", noVisibleCols);

        if(options.noDataTemplate) {
            td.html(options.noDataTemplate);
        }
        return td;
    };

    CT.setupDataBody = function (dataBody, options, labelsRow, filterForm, pagingFooter, noDataTbody) {
        const columns = [...options.columns];
        const dataRow = $("<tr>").appendTo(dataBody);
        if(options.dataRowAttrs && typeof options.dataRowAttrs!=="object") {
            throw new Error("options.dataRowAttrs must be an object");
        }
        const dataRowAttrs = {...(options.dataRowAttrs ?? {})};
        Object.keys(dataRowAttrs).forEach(attr => dataRow.attr(attr,dataRowAttrs[attr]));

        {
            dataBody.data("emptyview",noDataTbody);

            if(options?.features?.sorting) {
                dataBody.data("sort",labelsRow);
            }
            if(pagingFooter) {
                dataBody.data("paging",pagingFooter.find(".pages"))
                    .data("pagesizeinp",pagingFooter.find(".pagesize"))
                    .data("totalrecscount",pagingFooter.find(".totalrecscount"));
            }

            if(filterForm) {
                dataBody.data("filter",filterForm);
            }

            if(options.type) {
                dataBody.data("type",options.type);
            }
        }

        const dataRowFormId = "data_row_form_"+CT.uuid()+"_{{this.id}}";
        const editForm = options.features.update
            ? $("<form class='edit-form table-row-form'>").attr("id", dataRowFormId)
            : null;

        columns.forEach(col => {
            const dataCell = CT.setupCell(col,editForm);
            if(!col.hidden) {
                dataCell.appendTo(dataRow);
            }
        });

        if(options.features.delete  || options.features.update) {
            const buttonColumn = $("<td>").appendTo(dataRow);
            if(options.features.delete) {
                $("<div>").addClass("btn-group delete-item-grp").appendTo(buttonColumn).append(
                    $("<button>").addClass("btn btn-sm btn-danger delete-item")
                        .attr("type","button")
                        .attr("title","Delete item")
                        .append("<i class='fas fa-trash'></i>"));
            }

            if(options.features.update) {
                const grp = $("<div>").addClass("btn-group edit-item-grp").appendTo(buttonColumn);
                $("<button>").addClass("btn btn-sm btn-success save-item")
                    .attr("type","submit")
                    .attr("name","save")
                    .attr("title","Save item")
                    .attr("form",dataRowFormId)
                    .html("<i class='fas fa-save'></i>")
                    .appendTo(grp);
                $("<button>").addClass("btn btn-sm btn-secondary cancel-edit")
                    .attr("type","button")
                    .attr("name","cancel")
                    .attr("title","Cancel edit")
                    .attr("form",dataRowFormId)
                    .attr("onclick","$(this).parents('[data-type=item]').data().instance.loadFromRemote()")
                    .html("<i class='fas fa-undo'></i>")
                    .appendTo(grp);
            }
        }
        if (editForm) {
            CT.anchorRowForm(editForm, dataRow);
        }

        return dataBody;
    };

    CT.setupPagingFooter = function (footer, options, noVisibleCols) {
        CT.log("setupPagingFooter",footer,options,noVisibleCols);
        if(options.pagingFooterAttrs && options.pagingFooterAttrs.constructor===Object) {
            Object.keys(options.pagingFooterAttrs).forEach(att => footer.attr(att,options.pagingFooterAttrs[att]));
        }
        CT.log("noVisibleCols",noVisibleCols);
        footer.find("td").attr("colspan",noVisibleCols);
        return footer;
    };
})(window.KGrid);


/* --- insert-row.js --- */
(function (CT) {
    /**
     * Setup new record row
     * @returns {jQuery}
     */
    CT.setupNewRecordForm = function (table, options, k) {
        if(!options.insertFormRow || options.insertFormRow.constructor!==Object) {
            table.find(".before-main-tbody").remove();
            table.find(".after-main-tbody").remove();
            return;
        }

        const columns = [...options.columns];

        const newRecordRow = $("<tr>").addClass("new-record-row");
        const position = options.insertFormRow?.position ?? "top";
        if(position==="top") {
            table.find(".after-main-tbody").remove();
            newRecordRow.appendTo(table.find(".before-main-tbody"));
        }
        else {
            table.find(".before-main-tbody").remove();
            newRecordRow.appendTo(table.find(".after-main-tbody"));
        }

        const newRecordFormId = "new_record_row_form_"+CT.uuid();
        const newRecordForm = $("<form class='table-row-form'>").attr("id",newRecordFormId)
            .off("submit").on("submit",(event)=>{
                event.preventDefault();
                const data = CT.serializeForm(event.target, columns);
                Object.keys(data).forEach(key => {
                    if(columns.find(col => col.name === key)?.insert?.dontsave) {
                        delete data[key];
                    }
                });
                k.instance.newItem(data).then(()=>{
                    event.target.reset();
                    if(typeof options.onNewItemCreated=="function") {
                        options.onNewItemCreated(data);
                    }
                }).catch(CT.onError);
            });

        columns.forEach(col => {

            if(col.hidden) {
                if(options.features?.create && col.features?.create) {
                    const input = $("<input type='hidden'>")
                        .attr("name",col.name)
                        .attr("form",newRecordFormId).appendTo(newRecordForm);
                    if(col.insert.default) {
                        input.val(col.insert.default);
                    }
                }
                return;
            }
            if(!col.features.create){
                $("<td>").appendTo(newRecordRow).attr("data-label", col.label);
                return;
            }

            const insertConfig = col.insert;
            if(!insertConfig || insertConfig.constructor!==Object) {
                throw new Error("Column must have an insert config object when column.features.insert is true: \n"+JSON.stringify(col,null,2));
            }

            if(!insertConfig.type) {
                throw new Error("Column must have an insert.type when column.features.insert is true: \n"+JSON.stringify(col,null,2));
            }

            let input;
            let configOk = true;
            switch(insertConfig.type ?? "text") {
                case "autosuggest":
                    input = $(`<input autocomplete='off' type='text' class='form-input form-control form-control-sm' data-type='autosuggest'/>`);
                    if(insertConfig.options && typeof insertConfig.options === "object") {
                        ["url","labelFld","idFld"].forEach(key => {
                            if(!insertConfig.options[key]) {
                                configOk = false;
                            }
                        });
                    }
                    else {
                        configOk = false;
                    }
                    if(!configOk) {
                        throw new Error("Autosuggest column must have an insert.options object with url, labelFld and onselect when column.features.insert is true: \n"+JSON.stringify(col,null,2));
                    }
                    break;
                case "select2":
                    input = $(`<select class='form-input form-select form-select-sm select2' data-type='select2'/>`);
                    if(insertConfig.options && typeof insertConfig.options === "object") {
                        ["url","labelFld","idFld"].forEach(key => {
                            if(!insertConfig.options[key]) {
                                configOk = false;
                            }
                        });
                    }
                    else {
                        configOk = false;
                    }

                    if(!configOk) {
                        throw new Error("Select2 column must have an insert.options object with url and labelFld when column.features.insert is true: \n"+JSON.stringify(col,null,2));
                    }
                    break;
                case "textarea":
                    input = $(`<textarea class='form-input form-control form-control-sm'>`);
                    break;
                case "select":
                    input = $(`<select class='form-input form-control form-control-sm'/>`);
                    if(!insertConfig.options || !Array.isArray(insertConfig.options)) {
                        throw new Error("Column must have an insert.options array when column.features.insert is true: \n"+JSON.stringify(col,null,2));
                    }
                    insertConfig.options.forEach((opt)=>{
                        if(typeof opt.label!="string" || typeof opt.value=="undefined") {
                            throw new Error("Column must have an insert.options object with label and value when column.features.insert is true: \n"+JSON.stringify(col,null,2));
                        }
                        $("<option>").text(opt.label).attr("value",opt.value).appendTo(input);
                    });
                    break;
                case "hidden":
                    input = $(`<input type='hidden' class='form-input form-control form-control-sm'/>`);
                    break;
                default:
                    if(CT.VALID_INPUT_TYPES.includes(insertConfig.type)) {
                        input = $(`<input autocomplete='off' type='${insertConfig.type}' class='form-input form-control form-control-sm'/>`);
                    } else {
                        throw new Error("Invalid type: "+JSON.stringify(insertConfig,null,2));
                    }
            }

            if(insertConfig.default != null && insertConfig.default !== "" && !input.val()) {
                const defVal = (typeof insertConfig.default === "object" && insertConfig.default.value != null)
                    ? insertConfig.default.value
                    : insertConfig.default;
                if(String(defVal).trim()) {
                    input.val(defVal).trigger("change");
                }
            }

            if(insertConfig.attrs && typeof insertConfig.attrs === 'object') {
                Object.keys(insertConfig.attrs).forEach(k => input.attr(k, insertConfig.attrs[k]));
            }

            input.attr("form",newRecordFormId).attr("name",col.name);
            if(insertConfig.disabled) {
                input.attr("disabled",true);
            }
            if(insertConfig.readonly) {
                input.attr("readonly",true);
            }
            if(insertConfig.required) {
                input.attr("required",true);
            }
            if(insertConfig.attrs && typeof insertConfig.attrs === 'object') {
                Object.keys(insertConfig.attrs).forEach(k => input.attr(k, insertConfig.attrs[k]));
            }

            if(insertConfig.type!=="hidden") {
                $("<td>").append(input).appendTo(newRecordRow).attr("data-label", col.label);
            }
            if(insertConfig.type==="select2") {
                CT.wrapSelect2(input, {
                    ...insertConfig.options,
                    default: col.insert?.default ?? insertConfig.default
                });
            }
            if(insertConfig.type==="autosuggest") {
                CT.autosuggest(input, insertConfig.options);
            }
            if(insertConfig.events && Array.isArray(insertConfig.events)) {
                insertConfig.events.forEach(ev=>{
                    input.off(ev.event).on(ev.event, function(e, ...args) {
                        if (typeof ev.callback === "function") ev.callback(e, newRecordForm[0],newRecordRow[0], ...args);
                    });
                });
            }
        });
        CT.anchorRowForm(newRecordForm, newRecordRow);
        const actionColumn = $("<td>").appendTo(newRecordRow).attr("data-label","action");
        const grp = $("<div>").addClass("btn-group").appendTo(actionColumn);
        $("<button>").addClass("btn btn-sm btn-primary new-item-btn")
            .html("<i class='fas fa-plus-square'></i>")
            .attr("form",newRecordFormId)
            .attr("type","submit")
            .appendTo(grp);

        return newRecordRow;
    };
})(window.KGrid);


/* --- events.js --- */
(function (CT) {
    /**
     * Setup events for item after render
     */
    CT.setupEvents = function (item, table, options, colMap) {
        const view = item.views[0];

        options.columns.forEach(col=>{
            col.display.events.forEach(event=>{
                if(!event.selector || !event.event || !event.callback)
                    throw new Error("Invalid event: "+JSON.stringify(event,null,2));

                view.el.find(event.selector).off(event.event).on(event.event,(e)=>{
                    if(typeof event.callback!=="function")
                        throw new Error("Event callback must be a function: "+JSON.stringify(event,null,2));
                    event.callback(e,item,view);
                });
            });

            if(options.features.update) {
                col.update.events.forEach((event)=>{
                    if(!event.event || !event.callback)
                        throw new Error("Invalid event: "+JSON.stringify(event,null,2));

                    view.el.find("[name='"+col.name+"']").off(event.event).on(event.event,function(e,...args){
                        CT.log("event",event,e,this,args);
                        if(typeof event.callback!=="function")
                            throw new Error("Event callback must be a function: "+JSON.stringify(event,null,2));
                        event.callback(e,item,view,...args);
                    });
                });
            }
        });

        if(options.features.update) {
            view.el.find("input[data-type='autosuggest']").each((index,input)=>{
                const configUpdate = colMap.get(input.name).update;
                if(!configUpdate.options || !configUpdate.options.idFld || !configUpdate.options.labelFld)
                    throw new Error("Invalid autosuggest config: "+JSON.stringify(configUpdate,null,2));
                CT.autosuggest($(input), configUpdate.options);
            });

            view.el.find("select[data-type='select2']").each((index,input)=>{
                const configUpdate = colMap.get(input.name)?.update;
                if(!configUpdate?.options || !configUpdate.options.idFld || !configUpdate.options.labelFld) {
                    throw new Error("Invalid select2 config: "+JSON.stringify(configUpdate,null,2));
                }
                CT.initUpdateSelect2(input, configUpdate);
            });

            view.el.find("form.edit-form").off("submit").on("submit",(event)=>{
                const form = event.target;
                event.preventDefault();
                const instance = $(form).parents("[data-type=item]").data().instance;
                const data = CT.serializeForm(form);
                Object.keys(data).forEach(key => {
                    if(options.columns.find(col => col.name === key)?.update?.dontsave) {
                        delete data[key];
                    }
                });
                instance.update(data).catch(CT.onError);
            });
        }

        if(options.features.delete) {
            view.el.find("button.delete-item").off("click").on("click",(event)=>{
                event.preventDefault();
                view.el.addClass("confirm-delete");
                CT.confirm("Confirmi stergerea?",()=>{
                    item.delete().catch(CT.onError).finally(()=>view.el.removeClass("confirm-delete"));
                },()=>{
                    view.el.removeClass("confirm-delete");
                });
            });
        }
    };
})(window.KGrid);


/* --- init.js --- */
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

