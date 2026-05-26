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
