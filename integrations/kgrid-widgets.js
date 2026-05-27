/**
 * Optional widgets for KGrid custom input types.
 * Load after jQuery, kgrid.js, and any libraries (Select2, autosuggest, …).
 *
 *   KGrid.configure({
 *     customInputTypes: {
 *       select2: KGrid.select2(select2wrapper),
 *       autosuggest: KGrid.autosuggest(function ($input, o) { return $input.autosuggest(o); }),
 *     },
 *   });
 */
(function (CT) {
    function assertRemoteOptions(options, typeName, mode) {
        if (!options?.url || !options?.idFld || !options?.labelFld) {
            throw new Error(
                "Invalid " + typeName + " config (" + mode + "): " + JSON.stringify(options, null, 2)
            );
        }
    }

    function select2OptionsWithDefault($select, optionsConfig, defaultSpec) {
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
    }

    function assertSelect2Options(options, context) {
        if (!options?.url || !options?.idFld || !options?.labelFld) {
            throw new Error("Invalid select2 config (" + context + "): " + JSON.stringify(options, null, 2));
        }
    }

    CT.select2 = function (select2Wrapper) {
        if (typeof select2Wrapper !== "function") {
            throw new TypeError("select2(wrapper): wrapper must be a function");
        }

        function initOnField($input, wrapperOptions, context) {
            assertSelect2Options(wrapperOptions, context);
            const $inp = $($input);
            if ($inp.data("select2")) {
                $inp.select2("destroy");
            }
            select2Wrapper($inp, wrapperOptions);
        }

        return {
            filterEvents: false,
            filterDebounceMs: 0,
            validate(config, mode) {
                if (mode === "filter") {
                    return;
                }
                assertRemoteOptions(config.options, "select2", mode);
            },
            create({ mode, config }) {
                const cls =
                    mode === "filter"
                        ? "form-select form-select-sm select2"
                        : "form-input form-select form-select-sm select2";
                const $input = $("<select>").addClass(cls);
                const defaultSpec =
                    mode === "filter"
                        ? config.default
                        : config.value ?? config.default;
                if (defaultSpec && typeof defaultSpec === "object" && defaultSpec.value != null) {
                    $("<option>")
                        .text(defaultSpec.label ?? defaultSpec.value)
                        .attr("value", defaultSpec.value)
                        .appendTo($input);
                }
                return { $input, skipValueAttr: true };
            },
            mount({ mode, $input, config, col }) {
                if (mode === "filter") {
                    initOnField(
                        $input,
                        select2OptionsWithDefault($($input), config.options, config.default),
                        "filter"
                    );
                    return;
                }
                if (mode === "insert") {
                    select2Wrapper($input, {
                        ...config.options,
                        default: col?.insert?.default ?? config.default,
                    });
                    return;
                }
                if (mode === "update") {
                    initOnField(
                        $input[0],
                        select2OptionsWithDefault($($input), config.options, config.value),
                        "update"
                    );
                }
            },
            bindFilterSubmit($input, onSubmit) {
                $input.on("select2:select select2:clear", onSubmit);
            },
        };
    };

    CT.select2.helpers = {
        select2OptionsWithDefault,
        assertSelect2Options,
    };

    CT.autosuggest = function (autosuggestWrapper) {
        if (typeof autosuggestWrapper !== "function") {
            throw new TypeError("autosuggest(wrapper): wrapper must be a function");
        }
        return CT.inputType(
            function ($input, options) {
                autosuggestWrapper($input, options);
            },
            {
                element: "<input autocomplete='off' type='text' class='form-control form-control-sm'/>",
                formInputClass: "form-input",
                validate(config, mode) {
                    if (mode === "filter") {
                        return;
                    }
                    assertRemoteOptions(config.options, "autosuggest", mode);
                },
            }
        );
    };
})(window.KGrid);
