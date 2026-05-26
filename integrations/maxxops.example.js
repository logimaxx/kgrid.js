/**
 * Example: wire MAXXOPS lib.js helpers into KGrid.
 * Load after lib.js, select2.js, autosuggest.js, and kgrid.js.
 *
 * select2 / autosuggest register integration field types (see src/field-types-integrations.js).
 * Custom widgets: KGrid.registerFieldType("myType", { create, mount }).
 */
KGrid.configure({
    log: typeof klog === "function" ? klog : console.log.bind(console),
    onError: modal_error,
    confirm: modal_confirm,
    serializeForm: serializeFormData2,
    select2: select2wrapper,
    autosuggest: function ($input, options) {
        return $input.autosuggest(options);
    },
});
