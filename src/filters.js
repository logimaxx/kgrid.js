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
        $(document)
            .find("[form='" + formId + "']")
            .each(function () {
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
            const timer = setTimeout(
                function () {
                    $input.removeData(FILTER_DEBOUNCE_TIMER_KEY);
                    onSubmit.call(this);
                }.bind(this),
                delay
            );
            $input.data(FILTER_DEBOUNCE_TIMER_KEY, timer);
        };
    };

    CT.filterDefaultValue = function (defaultSpec) {
        if (defaultSpec != null && typeof defaultSpec === "object" && defaultSpec.value != null) {
            return defaultSpec.value;
        }
        return defaultSpec;
    };

    /** Hidden / persist filters survive reset and stay out of the visible filter row when appropriate. */
    CT.columnFilterPersisted = function (col) {
        const filter = col && col.filter ? col.filter : {};
        return !!(col && (col.hidden || filter.type === "hidden" || filter.persist));
    };

    /**
     * Ensure a named filter field exists on the hidden form (creates hidden input if needed).
     * @returns {HTMLInputElement|null}
     */
    CT.ensureFilterField = function (formEl, name, value, operator) {
        if (!formEl || !name || value == null || value === "") {
            return null;
        }
        let field = formEl.elements && formEl.elements.namedItem(name);
        if (field && field.length != null && !field.tagName) {
            field = field[0];
        }
        if (!field || !field.tagName) {
            field = document.createElement("input");
            field.type = "hidden";
            field.name = name;
            formEl.appendChild(field);
        }
        field.setAttribute("data-operator", operator || "=");
        field.value = String(value);
        field.defaultValue = String(value);
        return field;
    };

    CT.applyColumnDefaultFilters = function (formEl, columns) {
        if (!formEl || !columns) {
            return;
        }
        columns.forEach(function (col) {
            if (!col.name || (col.features && col.features.filter === false)) {
                return;
            }
            const filter = col.filter;
            if (!filter || filter.default == null || filter.default === "") {
                return;
            }
            const value = CT.filterDefaultValue(filter.default);
            if (value == null || value === "") {
                return;
            }
            const operator =
                filter.operator || (CT.columnFilterPersisted(col) ? "=" : "~=~");
            const $existing = CT.filterFormField(formEl, col.name);
            if (col.hidden || filter.type === "hidden" || !$existing.length) {
                CT.ensureFilterField(formEl, col.name, value, operator);
                return;
            }
            if (!$existing.val()) {
                $existing.val(String(value));
                $existing.attr("data-operator", operator);
            }
        });
    };

    /**
     * Re-apply persisted defaults on reset; optionally re-submit when URL lacks them.
     * @param {HTMLFormElement|JQuery} filterFormEl
     * @param {Object} options
     * @param {Object} [collection] KViews collection
     */
    CT.setupDefaultFilters = function (filterFormEl, options, collection) {
        const form = $(filterFormEl)[0];
        if (!form || !options || !options.features || !options.features.filtering) {
            return;
        }
        const columns = options.columns || [];
        CT.applyColumnDefaultFilters(form, columns);

        if (columns.some(CT.columnFilterPersisted)) {
            let resetting = false;
            $(form)
                .off("reset.kgridDefaultFilters")
                .on("reset.kgridDefaultFilters", function (e) {
                    if (resetting) {
                        return;
                    }
                    e.preventDefault();
                    CT.cancelFilterDebounces(form);
                    resetting = true;
                    try {
                        form.reset();
                        CT.applyColumnDefaultFilters(form, columns);
                        if (
                            collection &&
                            collection.filtering &&
                            typeof collection.filtering.handleSubmit === "function"
                        ) {
                            collection.filtering.handleSubmit(form);
                        } else {
                            $(form).trigger("submit");
                        }
                    } finally {
                        resetting = false;
                    }
                });
        }

        if (!collection || !collection.filtering) {
            return;
        }
        const persisted = columns.filter(function (col) {
            return (
                col.name &&
                col.filter &&
                col.filter.default != null &&
                col.filter.default !== "" &&
                CT.columnFilterPersisted(col)
            );
        });
        if (!persisted.length) {
            return;
        }
        const urlFilter = String(
            (collection.url &&
                collection.url.parameters &&
                collection.url.parameters.filter) ||
                ""
        );
        const missing = persisted.some(function (col) {
            return urlFilter.indexOf(col.name + "=") === -1;
        });
        if (missing) {
            collection.filtering.handleSubmit(form);
        }
    };

    /**
     * Setup filtering row.
     * Filter inputs live in <th> cells; they cannot sit inside one <form> in a <tr>.
     * Each control uses the HTML form="" attribute pointing at a hidden <form id="…"> (see setupFilterHeader).
     * @returns {jQuery|null} hidden filter form element (for FilterForm / KViews)
     */
    CT.setupFilterHeader = function (table, options) {
        if (!options.features || !options.features.filtering) {
            return null;
        }
        const theadFilters = table.find(".thead-filters");
        theadFilters.empty();

        const columns = [...options.columns];
        const filtersRow = $("<tr>");
        filtersRow.appendTo(theadFilters);
        const filterFormId = "filter_form_" + CT.uuid();
        const filterForm = $("<form>")
            .attr("id", filterFormId)
            .attr("hidden", "hidden")
            .attr("aria-hidden", "true")
            .addClass("table-filter-form")
            .insertBefore(table);

        columns.forEach((col) => {
            const filter = col.filter || {};
            const skipVisible = col.hidden || filter.type === "hidden";

            if (skipVisible) {
                if (col.features && col.features.filter === false) {
                    return;
                }
                if (!col.name) {
                    return;
                }
                const defVal = CT.filterDefaultValue(filter.default);
                if (defVal != null && defVal !== "") {
                    CT.ensureFilterField(
                        filterForm[0],
                        col.name,
                        defVal,
                        filter.operator || "="
                    );
                } else if (CT.columnFilterPersisted(col)) {
                    CT.ensureFilterField(filterForm[0], col.name, "", filter.operator || "=");
                }
                return;
            }

            let filterCell = $("<th>").appendTo(filtersRow).attr("data-label", col.label);
            CT.applyColumnCellMeta(filterCell, col);

            if (col.features.filter === false) {
                return;
            }
            if (!col.name) {
                throw new Error(
                    "Column must have a name when column.features.filter is true: \n" +
                        JSON.stringify(col, null, 2)
                );
            }

            let input;
            let pluggableResult = null;
            const pluggable = CT.createFieldInput({ mode: "filter", col, config: filter });
            if (pluggable) {
                pluggableResult = pluggable;
                input = pluggable.$input;
                input.appendTo(filterCell);
                CT.mountField({ mode: "filter", $input: input, col, config: filter });
            } else {
                switch (filter.type) {
                    case "select":
                        if (!filter.options) {
                            throw new Error(
                                "Column must have a filter.options array when column.filter.type is select: \n" +
                                    JSON.stringify(col, null, 2)
                            );
                        }
                        input = $("<select>").addClass("form-select form-select-sm");
                        if (Array.isArray(filter.options)) {
                            filter.options.forEach((opt) => {
                                if (!opt.label || typeof opt.value !== "string") {
                                    throw new Error(
                                        "Column must have an filter.options object with label and value when column.filter.type is select: \n" +
                                            JSON.stringify(col, null, 2)
                                    );
                                }
                                $("<option>")
                                    .text(opt.label)
                                    .attr("value", opt.value)
                                    .appendTo(input);
                            });
                        } else {
                            throw new Error(
                                "Column must have a filter.options array when column.filter.type is select: \n" +
                                    JSON.stringify(col, null, 2)
                            );
                        }
                        input.appendTo(filterCell);
                        break;
                    default:
                        if (!CT.isValidFilterType(filter.type)) {
                            throw new Error("Unknown filter type: " + filter.type);
                        }
                        input = $(
                            `<input autocomplete='off' type='${filter.type}' class='form-control form-control-sm'/>`
                        );
                        input.appendTo(filterCell);
                }
            }

            input.attr("data-operator", filter.operator);
            input.attr("form", filterFormId);
            input.attr("name", col.name);

            const defVal = CT.filterDefaultValue(filter.default);
            if (defVal != null && defVal !== "" && !input.val()) {
                input.val(String(defVal));
                input.attr("data-default", String(defVal));
                if (input[0]) {
                    input[0].defaultValue = String(defVal);
                }
            }

            const submitFilterForm = function () {
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
        this.filter = (name, value, operator = "~=~") => {
            if (!this.form) return this;
            let $field = CT.filterFormField(this.form, name);
            if (!$field.length) {
                CT.ensureFilterField(this.form, name, value, operator);
                $field = CT.filterFormField(this.form, name);
            }
            if (!$field.length) return this;
            CT.flushFilterSubmit($field);
            $field.val(value);
            const oldOperator = $field.attr("data-operator");
            $field.attr("data-operator", operator);
            $(this.form).trigger("submit");
            $field.attr("data-operator", oldOperator);
            return this;
        };
        this.ensure = (name, value, operator = "=") => {
            CT.ensureFilterField(this.form, name, value, operator);
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
