(function (CT) {
    /** select2wrapper options: AJAX config + default from <option> or config default spec. */
    CT.select2OptionsWithDefault = function ($select, optionsConfig, defaultSpec) {
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
    };

    CT.assertSelect2Options = function (options, context) {
        if (!options?.url || !options?.idFld || !options?.labelFld) {
            throw new Error("Invalid select2 config (" + context + "): " + JSON.stringify(options, null, 2));
        }
    };

    CT.initSelect2OnField = function ($input, wrapperOptions, context) {
        CT.assertSelect2Options(wrapperOptions, context);
        const $inp = $($input);
        if ($inp.data("select2")) {
            $inp.select2("destroy");
        }
        CT.wrapSelect2($inp, wrapperOptions);
    };

    CT.select2OptionsForUpdate = function ($select, updateConfig) {
        return CT.select2OptionsWithDefault($select, updateConfig.options, updateConfig.value);
    };

    CT.initUpdateSelect2 = function ($input, updateConfig) {
        CT.initSelect2OnField($input, CT.select2OptionsForUpdate($($input), updateConfig), "update");
    };

    CT.select2OptionsForFilter = function ($select, filter) {
        return CT.select2OptionsWithDefault($select, filter.options, filter.default);
    };

    CT.initFilterSelect2 = function ($input, filter) {
        CT.initSelect2OnField($input, CT.select2OptionsForFilter($($input), filter), "filter");
    };
})(window.KGrid);
