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
