/**
 * Example: wire MAXXOPS lib.js helpers into KGrid.
 * Load: lib.js, select2.js, autosuggest.js, kgrid.js, kgrid-widgets.js
 */
KGrid.configure({
    log: typeof klog === "function" ? klog : console.log.bind(console),
    onError: modal_error,
    confirm: modal_confirm,
    serializeForm: serializeFormData2,
    customInputTypes: {
        select2: KGrid.select2(select2wrapper),
        autosuggest: KGrid.autosuggest(function ($input, options) {
            return $input.autosuggest(options);
        }),
    },
});
