(function (CT) {
    /**
     * Bootstrap switch wrapper around a checkbox used as a boolean flag.
     * @param {JQuery} $input
     * @returns {JQuery} wrapper
     */
    CT.wrapFlagSwitch = function ($input) {
        $input
            .attr({ type: "checkbox", role: "switch", value: "1" })
            .removeClass("form-control form-input form-control-sm")
            .addClass("form-check-input");
        return $("<div class='form-check form-switch kgrid-flag-switch mb-0'>").append($input);
    };

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
        CT.applyColumnCellMeta($cell, col);

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
        const updateType = updateConfig.type ?? "text";
        let input;
        let skipValueAttr = false;

        const pluggable = CT.createFieldInput({ mode: "update", col, config: updateConfig });
        if (pluggable) {
            input = pluggable.$input;
            skipValueAttr = !!pluggable.skipValueAttr;
        } else {
            switch(updateType) {
                case "textarea":
                    input = $(`<textarea class='form-input form-control form-control-sm'>{{${updateConfig.value??c.name}}}</textarea>`);
                    skipValueAttr = true;
                    break;
                case "select":
                    input = $(`<select class='form-input form-control form-control-sm'/>`);
                    if(!Array.isArray(updateConfig.options)) {
                        throw new Error("Select column must have an update.options array when column.features.update is true: \n"+JSON.stringify(col,null,2));
                    }
                    updateConfig.options.forEach((opt) => {
                        if(typeof opt.label !== "string" || typeof opt.value === "undefined") {
                            throw new Error("Select update.options entries need label and value: \n"+JSON.stringify(col,null,2));
                        }
                        $("<option>").text(opt.label).attr("value", opt.value).appendTo(input);
                    });
                    skipValueAttr = true;
                    break;
                case "hidden":
                    input = $(`<input type='hidden' class='form-input form-control form-control-sm'/>`);
                    break;
                case "displayonly": {
                    const tpl =
                        updateConfig.template ||
                        c.display.template ||
                        `{{${c.name}}}`;
                    $("<div>").addClass("cell-input").append(tpl).appendTo($cell);
                    return $cell;
                }
                case "checkbox":
                    input = $("<input autocomplete='off' type='checkbox' class='form-check-input'/>");
                    skipValueAttr = true;
                    break;
                default:
                    if(CT.isValidInputType(updateType)) {
                        input = $(`<input autocomplete='off' type='${updateType}' class='form-input form-control form-control-sm'/>`);
                    } else {
                        throw new Error("Invalid update updateConfig type: "+JSON.stringify(updateConfig,null,2));
                    }
            }
            input.attr("data-type", updateType);
        }

        if(updateConfig.attrs && typeof updateConfig.attrs === 'object') {
            Object.keys(updateConfig.attrs).forEach(k => input.attr(k, updateConfig.attrs[k]));
        }

        input.attr("form",formId);
        input.attr("name",c.name);
        if (!skipValueAttr && updateType !== "textarea") {
            const rawValue = updateConfig.value ?? `{{${c.name}}}`;
            if (rawValue != null && typeof rawValue !== "object") {
                input.attr("value", rawValue);
            }
        }

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

        const $control = updateType === "checkbox" ? CT.wrapFlagSwitch(input) : input;
        $("<div>").addClass("cell-input").append($control).appendTo($cell);
        return $cell;
    };
})(window.KGrid);
