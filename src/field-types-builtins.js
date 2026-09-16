/**
 * Built-in field types with no external library dependency (plain HTML / jQuery DOM).
 */
(function (CT) {
    const MULTI_SELECT_VALUE_CLASS = "kgrid-multi-select-value";
    const MULTI_SELECT_SEP = ";";

    /**
     * Normalize multi_select values to a semicolon-joined string (dbAPI `><` / IN).
     * @param {*} value
     * @param {string} [sep]
     * @returns {string}
     */
    CT.normalizeMultiSelectValue = function (value, sep) {
        const separator = sep || MULTI_SELECT_SEP;
        if (value == null || value === "") {
            return "";
        }
        if (Array.isArray(value)) {
            return value
                .filter(function (v) {
                    return v != null && v !== "";
                })
                .map(String)
                .join(separator);
        }
        return String(value);
    };

    CT.parseMultiSelectValue = function (value, sep) {
        const str = CT.normalizeMultiSelectValue(value, sep);
        if (!str) {
            return [];
        }
        return str.split(sep || MULTI_SELECT_SEP).filter(Boolean);
    };

    (function installMultiSelectValHooks() {
        const prev = $.valHooks.hidden || {};
        $.valHooks.hidden = {
            get: function (elem) {
                if (elem && elem.classList && elem.classList.contains(MULTI_SELECT_VALUE_CLASS)) {
                    return elem.value;
                }
                return prev.get ? prev.get(elem) : undefined;
            },
            set: function (elem, value) {
                if (elem && elem.classList && elem.classList.contains(MULTI_SELECT_VALUE_CLASS)) {
                    const sep = $(elem).data("kgridMultiSep") || MULTI_SELECT_SEP;
                    elem.value = CT.normalizeMultiSelectValue(value, sep);
                    $(elem).triggerHandler("kgrid:multiselect:set");
                    return true;
                }
                return prev.set ? prev.set(elem, value) : undefined;
            },
        };
    })();

    function assertMultiSelectOptions(config, mode) {
        if (!Array.isArray(config.options)) {
            throw new Error(
                "multi_select requires an options array (" +
                    mode +
                    "): " +
                    JSON.stringify(config, null, 2)
            );
        }
        config.options.forEach(function (opt) {
            if (!opt || typeof opt.label !== "string" || typeof opt.value !== "string") {
                throw new Error(
                    "multi_select options need string label and value: " +
                        JSON.stringify(config, null, 2)
                );
            }
        });
    }

    function multiSelectEmptyLabel(config) {
        if (config.placeholder != null && config.placeholder !== "") {
            return String(config.placeholder);
        }
        return "All";
    }

    function multiSelectSummary(selected, options, emptyLabel) {
        if (!selected.length) {
            return emptyLabel;
        }
        if (selected.length === 1) {
            const match = options.find(function (opt) {
                return opt.value === selected[0];
            });
            return match ? match.label : selected[0];
        }
        return selected.length + " selected";
    }

    function buildMultiSelectUi($input, config, mode) {
        const sep = config.separator || MULTI_SELECT_SEP;
        const options = config.options || [];
        const emptyLabel = multiSelectEmptyLabel(config);
        const compact = mode === "filter";

        $input.data("kgridMultiSep", sep);
        $input.addClass(MULTI_SELECT_VALUE_CLASS);

        const $root = $("<div>")
            .addClass("kgrid-multi-select")
            .attr("data-mode", mode);
        const $panel = $("<div>").addClass("kgrid-multi-select-panel");
        let $toggle = null;

        if (compact) {
            $toggle = $("<button>")
                .attr({ type: "button", "aria-expanded": "false" })
                .addClass("kgrid-multi-select-toggle form-select form-select-sm");
            $panel.attr("hidden", "hidden");
            $root.append($toggle, $panel);
        } else {
            $root.addClass("kgrid-multi-select-open");
            $root.append($panel);
        }

        options.forEach(function (opt, index) {
            const uid = "kgrid_ms_" + CT.uuid() + "_" + index;
            const $label = $("<label>")
                .addClass("kgrid-multi-select-option")
                .attr("for", uid);
            $("<input>")
                .attr({
                    type: "checkbox",
                    id: uid,
                    value: opt.value,
                    class: "kgrid-multi-select-check",
                })
                .appendTo($label);
            $("<span>").addClass("kgrid-multi-select-label").text(opt.label).appendTo($label);
            $panel.append($label);
        });

        $input.before($root);
        $root.append($input);

        function selectedValues() {
            return CT.parseMultiSelectValue($input[0].value, sep);
        }

        function syncCheckboxesFromInput() {
            const selected = selectedValues();
            $panel.find("input[type='checkbox']").each(function () {
                this.checked = selected.indexOf(this.value) !== -1;
            });
            if ($toggle) {
                $toggle.text(multiSelectSummary(selected, options, emptyLabel));
            }
        }

        function syncInputFromCheckboxes(triggerChange) {
            const vals = [];
            $panel.find("input[type='checkbox']:checked").each(function () {
                vals.push(this.value);
            });
            const next = vals.join(sep);
            if ($input[0].value !== next) {
                $input[0].value = next;
                if (triggerChange) {
                    $input.trigger("change");
                }
            }
            if ($toggle) {
                $toggle.text(multiSelectSummary(vals, options, emptyLabel));
            }
        }

        function setOpen(open) {
            if (!$toggle) {
                return;
            }
            if (open) {
                // Leave the table/card overflow context so the list is fully visible.
                $panel.appendTo(document.body);
                $panel.addClass("kgrid-multi-select-panel-floating");
                $panel.removeAttr("hidden");
                $root.addClass("kgrid-multi-select-open");
                $toggle.attr("aria-expanded", "true");
                positionFilterPanel();
            } else {
                $panel.attr("hidden", "hidden");
                $root.removeClass("kgrid-multi-select-open");
                $toggle.attr("aria-expanded", "false");
                clearFilterPanelPosition();
                $panel.removeClass("kgrid-multi-select-panel-floating");
                $panel.insertAfter($toggle);
            }
        }

        function positionFilterPanel() {
            if (!$toggle) {
                return;
            }
            const rect = $toggle[0].getBoundingClientRect();
            const width = Math.max(rect.width, 12 * 16);
            let left = rect.left;
            const maxLeft = window.innerWidth - width - 8;
            if (left > maxLeft) {
                left = Math.max(8, maxLeft);
            }
            let top = rect.bottom + 2;
            const approxHeight = Math.min(14 * 16, options.length * 28 + 16);
            if (top + approxHeight > window.innerHeight - 8 && rect.top > approxHeight + 8) {
                top = rect.top - approxHeight - 2;
            }
            $panel.css({
                position: "fixed",
                top: top + "px",
                left: left + "px",
                width: width + "px",
                minWidth: width + "px",
                maxWidth: "min(18rem, calc(100vw - 16px))",
                zIndex: 1080,
            });
        }

        function clearFilterPanelPosition() {
            $panel.css({
                position: "",
                top: "",
                left: "",
                width: "",
                minWidth: "",
                maxWidth: "",
                zIndex: "",
            });
        }

        const ns = ".kgridMultiSelect_" + CT.uuid();

        $panel.on("change", "input[type='checkbox']", function () {
            syncInputFromCheckboxes(true);
        });

        $input.on("kgrid:multiselect:set", function () {
            syncCheckboxesFromInput();
        });

        if ($toggle) {
            $toggle.on("click", function (e) {
                e.preventDefault();
                e.stopPropagation();
                setOpen(!$root.hasClass("kgrid-multi-select-open"));
            });
            $(document).on("mousedown" + ns, function (e) {
                if (!$root.hasClass("kgrid-multi-select-open")) {
                    return;
                }
                if ($(e.target).closest($root).length || $(e.target).closest($panel).length) {
                    return;
                }
                setOpen(false);
            });
            $(window).on("resize" + ns + " scroll" + ns, function () {
                if ($root.hasClass("kgrid-multi-select-open")) {
                    positionFilterPanel();
                }
            });
        }

        const formBind = function () {
            const formEl = $input.prop("form") || ($input[0] && $input[0].form);
            if (!formEl) {
                return;
            }
            $(formEl).off("reset" + ns).on("reset" + ns, function () {
                setTimeout(syncCheckboxesFromInput, 0);
            });
        };
        formBind();
        setTimeout(formBind, 0);

        syncCheckboxesFromInput();
        return $root;
    }

    CT.registerFieldType("multi_select", {
        filterEvents: "change",
        filterDebounceMs: 0,
        validate(config, mode) {
            assertMultiSelectOptions(config, mode);
        },
        create({ config }) {
            const $input = $("<input type='hidden'>").addClass(MULTI_SELECT_VALUE_CLASS);
            if (config.separator) {
                $input.data("kgridMultiSep", config.separator);
            }
            return { $input, skipValueAttr: true };
        },
        mount(ctx) {
            buildMultiSelectUi(ctx.$input, ctx.config || {}, ctx.mode);
            if (ctx.mode === "update" && ctx.item && ctx.col && ctx.col.name) {
                const raw = ctx.item.attributes ? ctx.item.attributes[ctx.col.name] : null;
                if (raw != null && raw !== "") {
                    ctx.$input.val(raw);
                }
            }
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
