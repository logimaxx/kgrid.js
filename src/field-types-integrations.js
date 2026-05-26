/**
 * Field types that delegate to host-configured wrappers (Select2, autosuggest, …).
 * Registered only when KGrid.configure({ select2 }) / configure({ autosuggest }) supplies a function.
 */
(function (CT) {
    function assertRemoteOptions(options, typeName, mode) {
        if (!options?.url || !options?.idFld || !options?.labelFld) {
            throw new Error(
                "Invalid " + typeName + " config (" + mode + "): " + JSON.stringify(options, null, 2)
            );
        }
    }

    const select2Plugin = {
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
                CT.initFilterSelect2($input, config);
                return;
            }
            if (mode === "insert") {
                CT.wrapSelect2($input, {
                    ...config.options,
                    default: col?.insert?.default ?? config.default,
                });
                return;
            }
            if (mode === "update") {
                CT.initUpdateSelect2($input[0], { options: config.options, value: config.value });
            }
        },
        bindFilterSubmit($input, onSubmit) {
            $input.on("select2:select select2:clear", onSubmit);
        },
    };

    const autosuggestPlugin = {
        validate(config, mode) {
            if (mode === "filter") {
                return;
            }
            assertRemoteOptions(config.options, "autosuggest", mode);
        },
        create({ mode }) {
            const $input = $(
                "<input autocomplete='off' type='text' class='form-control form-control-sm'/>"
            );
            if (mode === "insert" || mode === "update") {
                $input.addClass("form-input");
            }
            return { $input };
        },
        mount({ $input, config }) {
            CT.autosuggest($input, config.options ?? config);
        },
    };

    CT._syncIntegrationFieldTypes = function () {
        const integrations = [
            { name: "select2", hook: CT._config.select2, plugin: select2Plugin },
            { name: "autosuggest", hook: CT._config.autosuggest, plugin: autosuggestPlugin },
        ];
        integrations.forEach(({ name, hook, plugin }) => {
            if (typeof hook === "function") {
                CT.registerFieldType(name, plugin, { overwrite: true });
            } else if (CT._fieldTypes[name]) {
                delete CT._fieldTypes[name];
            }
        });
    };
})(window.KGrid);
