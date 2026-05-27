(function (CT) {
    const FILTER_DEBOUNCE_TIMER_KEY = "kgridFilterDebounceTimer";

    /**
     * Cancel a pending debounced filter submit on one control.
     * @param {JQuery} $input
     */
    CT.cancelFilterSubmit = function ($input) {
        const timer = $input.data(FILTER_DEBOUNCE_TIMER_KEY);
        if (timer) {
            clearTimeout(timer);
            $input.removeData(FILTER_DEBOUNCE_TIMER_KEY);
        }
    };

    /**
     * Cancel debounced submits for all fields associated with a filter form.
     * @param {HTMLFormElement|JQuery} form
     */
    CT.cancelFilterDebounces = function (form) {
        const formId = $(form).attr("id");
        if (!formId) {
            return;
        }
        $(document).find("[form='" + formId + "']").each(function () {
            CT.cancelFilterSubmit($(this));
        });
    };

    /**
     * Run a pending debounced submit immediately, if any.
     * @param {JQuery} $input
     */
    CT.flushFilterSubmit = function ($input) {
        const timer = $input.data(FILTER_DEBOUNCE_TIMER_KEY);
        if (!timer) {
            return;
        }
        clearTimeout(timer);
        $input.removeData(FILTER_DEBOUNCE_TIMER_KEY);
        const form = $input[0] && $input[0].form;
        if (form) {
            $(form).trigger("submit");
        }
    };

    /**
     * Optionally debounce filter submit (see resolveFilterDebounceMs / shouldDebounceFilterSubmit).
     * @param {JQuery} $input
     * @param {Function} onSubmit bound with control as `this`
     * @param {string|null} events resolved filter events
     * @param {number} debounceMs
     * @returns {Function}
     */
    CT.wrapFilterSubmitHandler = function ($input, onSubmit, events, debounceMs) {
        if (!CT.shouldDebounceFilterSubmit(events, debounceMs)) {
            return onSubmit;
        }
        const delay = debounceMs;
        return function filterSubmitDebounced() {
            CT.cancelFilterSubmit($input);
            const timer = setTimeout(function () {
                $input.removeData(FILTER_DEBOUNCE_TIMER_KEY);
                onSubmit.call(this);
            }.bind(this), delay);
            $input.data(FILTER_DEBOUNCE_TIMER_KEY, timer);
        };
    };

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
            let pluggableResult = null;
            const pluggable = CT.createFieldInput({ mode: "filter", col, config: filter });
            if (pluggable) {
                pluggableResult = pluggable;
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
                            throw new Error("Column must have a filter.options array when column.filter.type is select: \n"+JSON.stringify(col,null,2));
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
            CT.bindFilterInputEvents({
                type: filter.type,
                $input: input,
                onSubmit: submitFilterForm,
                createResult: pluggableResult,
                filterConfig: filter,
            });
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
            CT.flushFilterSubmit($field);
            $field.val(value);
            const oldOperator = $field.attr("data-operator");
            $field.attr("data-operator", operator);
            $(this.form).trigger("submit");
            $field.attr("data-operator", oldOperator);
            return this;
        };
        this.reset = () => {
            if (this.form) {
                CT.cancelFilterDebounces(this.form);
                this.form.reset();
            }
            return this;
        };
    };
})(window.KGrid);
