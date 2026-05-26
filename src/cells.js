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
