/**
 * Demo custom input type for KGrid — a native HTML `<select>` wrapped as a field-type plugin.
 *
 * No external libraries. Use this file as a minimal reference when building your own
 * `customInputTypes` plugins.
 *
 * Load order: jQuery → kgrid.js → this script → `KGrid.configure()` → `KGrid.init()`.
 *
 * @example Host wiring (see also demo/js/app.js)
 * KGrid.configure({
 *   customInputTypes: {
 *     demo_select: KGrid.demoSelect(),
 *   },
 * });
 *
 * @example Column config (filter, insert, and/or update)
 * filter: {
 *   type: "demo_select",
 *   operator: "=",
 *   options: [
 *     { label: "All", value: "" },
 *     { label: "Hardware", value: "hardware" },
 *   ],
 * },
 * insert: { type: "demo_select", options: [...], events: [] },
 * update: { type: "demo_select", options: [...], events: [] },
 *
 * Registration: `demoSelect()` returns a plugin object; KGrid registers it when you pass
 * that object in `configure({ customInputTypes })` (same as `registerFieldType`, but
 * grouped with other host config). You can also call `KGrid.registerFieldType("demo_select", plugin)`
 * directly if you prefer.
 */
(function (CT) {
    /**
     * Append `{ label, value }` entries to a `<select>`.
     * @param {JQuery} $select
     * @param {Array<{ label: string, value: string }>} options
     */
    function fillOptions($select, options) {
        if (!Array.isArray(options)) {
            throw new Error("demo_select: options must be an array");
        }
        options.forEach(function (opt) {
            if (typeof opt.label !== "string" || typeof opt.value === "undefined") {
                throw new Error("demo_select: each option needs label and value");
            }
            $("<option>").text(opt.label).attr("value", String(opt.value)).appendTo($select);
        });
    }

    /**
     * Build the `demo_select` field-type plugin.
     *
     * Does not register by itself — pass the return value to:
     * `KGrid.configure({ customInputTypes: { demo_select: KGrid.demoSelect() } })`.
     *
     * @returns {{ filterEvents: string, create: Function, mount: Function }}
     */
    CT.demoSelect = function () {
        return {
            /**
             * Filter row: submit the hidden filter form on `change` only (not `input`, which
             * would fire twice on `<select>` in some browsers).
             */
            filterEvents: "change",

            /**
             * Create the control DOM for filter, insert, or update.
             * @param {{ mode: "filter"|"insert"|"update", col: object, config: object }} ctx
             * @returns {{ $input: JQuery, skipValueAttr: boolean }}
             */
            create({ mode, config }) {
                const cls =
                    mode === "filter"
                        ? "form-select form-select-sm"
                        : "form-input form-select form-control form-control-sm";
                const $input = $("<select>").addClass(cls);
                fillOptions($input, config.options);
                // skipValueAttr: native update path sets <select> via mount(), not value=""
                return { $input, skipValueAttr: true };
            },

            /**
             * After the row is in the DOM (update mode): set the current value from the item.
             * Built-in `type: "select"` does this in KGrid events; pluggable types must do it here.
             * @param {{ mode: string, $input: JQuery, col: object, item?: object }} ctx
             */
            mount({ mode, $input, col, item }) {
                if (mode !== "update" || !item?.attributes || !col?.name) {
                    return;
                }
                const val = item.attributes[col.name];
                if (val != null && val !== "") {
                    $input.val(typeof val === "boolean" ? String(val) : val);
                }
            },
        };
    };
})(window.KGrid);
