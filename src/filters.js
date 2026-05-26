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
            const pluggable = CT.createFieldInput({ mode: "filter", col, config: filter });
            if (pluggable) {
                input = pluggable.$input;
                input.appendTo(filterCell);
                CT.mountField({ mode: "filter", $input: input, col, config: filter });
            } else {
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
                        input.appendTo(filterCell);
                        break;
                    default:
                        if (!CT.isValidFilterType(filter.type)) {
                            throw new Error("Unknown filter type: " + filter.type);
                        }
                        input = $(`<input autocomplete='off' type='${filter.type}' class='form-control form-control-sm'/>`);
                        input.appendTo(filterCell);
                }
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
            CT.bindFieldFilterSubmit(filter.type, input, submitFilterForm);
        });


        if (CT.hasActionColumn(options)) {
            $("<th>")
                .addClass("kgrid-row-actions")
                .attr("data-label", "Actions")
                .appendTo(filtersRow);
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
