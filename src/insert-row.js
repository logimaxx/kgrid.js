(function (CT) {
    /**
     * Setup new record row
     * @returns {jQuery}
     */
    CT.setupNewRecordForm = function (table, options, grid) {
        if(!options.insertFormRow || !CT.isPlainObject(options.insertFormRow)) {
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
                grid.instance.newItem(data).then(()=>{
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
                const $empty = $("<td>").appendTo(newRecordRow).attr("data-label", col.label);
                CT.applyColumnCellMeta($empty, col);
                return;
            }

            const insertConfig = col.insert;
            if(!insertConfig || !CT.isPlainObject(insertConfig)) {
                throw new Error("Column must have an insert config object when column.features.create is true: \n"+JSON.stringify(col,null,2));
            }

            if(!insertConfig.type) {
                throw new Error("Column must have an insert.type when column.features.insert is true: \n"+JSON.stringify(col,null,2));
            }

            let input;
            const insertType = insertConfig.type ?? "text";
            const pluggable = CT.createFieldInput({ mode: "insert", col, config: insertConfig });
            if (pluggable) {
                input = pluggable.$input;
            } else {
                switch(insertType) {
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
                    case "checkbox":
                        input = $("<input autocomplete='off' type='checkbox' class='form-check-input'/>");
                        input.attr("data-type", insertType);
                        break;
                    default:
                        if(CT.isValidInputType(insertType)) {
                            input = $(`<input autocomplete='off' type='${insertType}' class='form-input form-control form-control-sm'/>`);
                        } else {
                            throw new Error("Invalid type: "+JSON.stringify(insertConfig,null,2));
                        }
                        input.attr("data-type", insertType);
                }
            }

            const rawDefault = (typeof insertConfig.default === "object" && insertConfig.default && insertConfig.default.value != null)
                ? insertConfig.default.value
                : insertConfig.default;
            if (insertType === "checkbox") {
                input.prop("checked", CT.isFlagOn(rawDefault));
            } else if(insertConfig.default != null && insertConfig.default !== "" && !input.val()) {
                if(String(rawDefault).trim()) {
                    input.val(rawDefault).trigger("change");
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
                const $control = insertType === "checkbox" ? CT.wrapFlagSwitch(input) : input;
                const $td = $("<td>").append($control).appendTo(newRecordRow).attr("data-label", col.label);
                CT.applyColumnCellMeta($td, col);
            }
            CT.mountField({
                mode: "insert",
                $input: input,
                col,
                config: insertConfig,
                formEl: newRecordForm[0],
                rowEl: newRecordRow[0],
            });
            if(insertConfig.events && Array.isArray(insertConfig.events)) {
                insertConfig.events.forEach(ev=>{
                    input.off(ev.event).on(ev.event, function(e, ...args) {
                        if (typeof ev.callback === "function") ev.callback(e, newRecordForm[0],newRecordRow[0], ...args);
                    });
                });
            }
        });
        CT.anchorRowForm(newRecordForm, newRecordRow);
        const actionColumn = $("<td>")
            .addClass("kgrid-row-actions")
            .appendTo(newRecordRow)
            .attr("data-label", "action");
        const grp = $("<div>").addClass("btn-group").appendTo(actionColumn);
        $("<button>").addClass("btn btn-sm btn-primary new-item-btn")
            .html("<i class='fas fa-plus-square'></i>")
            .attr("form",newRecordFormId)
            .attr("type","submit")
            .appendTo(grp);

        if (typeof options.onInsertRowReady === "function") {
            options.onInsertRowReady(newRecordForm[0], newRecordRow[0]);
        }

        return newRecordRow;
    };
})(window.KGrid);
