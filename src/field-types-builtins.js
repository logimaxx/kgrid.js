/**
 * Built-in field types with no external library dependency (plain HTML / jQuery DOM).
 */
(function (CT) {
    CT.registerFieldType("multi_select", {
        create({ config }) {
            const $input = $("<select class='form-select form-select-sm' multiple>");
            if (Array.isArray(config.options)) {
                config.options.forEach((opt) => {
                    $("<option>").text(opt.label).attr("value", opt.value).appendTo($input);
                });
            }
            return { $input, skipValueAttr: true };
        },
    });

    CT.registerFieldType("date_range", {
        create() {
            const $input = $(
                "<input autocomplete='off' type='date' class='form-control form-control-sm'/>"
            );
            return { $input };
        },
    });
})(window.KGrid);
