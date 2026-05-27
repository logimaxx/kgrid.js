/**
 * Pluggable field types for filter / insert / update contexts.
 *
 *   KGrid.configure({ customInputTypes: { myType: { create, mount?, … } } })
 *   KGrid.registerFieldType(name, plugin)
 *   KGrid.inputType(mount, { element })  — simple widget helper
 *
 * Plugin shape:
 *   create({ mode, col, config }) — required; returns { $input, skipValueAttr?, filterEvents? }
 *   filterEvents? — jQuery event names for filter submit (e.g. "change", "input"); false = none (use bindFilterSubmit)
 *   filterDebounceMs? — override configure/filter.debounceMs for this type
 *   mount?, validate?, bindFilterSubmit? — extra widget-specific filter events
 */
(function (CT) {
    CT._fieldTypes = Object.create(null);
    CT._configuredCustomInputTypeNames = [];

    CT.registerFieldType = function (name, plugin, options) {
        if (!name || typeof name !== "string") {
            throw new TypeError("registerFieldType(name, plugin): name must be a string");
        }
        if (!plugin || typeof plugin.create !== "function") {
            throw new TypeError("registerFieldType(" + name + "): plugin.create is required");
        }
        if (CT._fieldTypes[name] && !(options && options.overwrite)) {
            throw new Error("Field type already registered: " + name);
        }
        CT._fieldTypes[name] = Object.assign({ name }, plugin);
        return CT;
    };

    CT.unregisterFieldType = function (name) {
        if (name && CT._fieldTypes[name]) {
            delete CT._fieldTypes[name];
        }
        return CT;
    };

    CT.getFieldType = function (name) {
        return name ? CT._fieldTypes[name] || null : null;
    };

    CT.listFieldTypes = function () {
        return Object.keys(CT._fieldTypes);
    };

    CT.createFieldInput = function ({ mode, col, config }) {
        const type = config.type ?? "text";
        const plugin = CT.getFieldType(type);
        if (!plugin) {
            return null;
        }
        if (typeof plugin.validate === "function") {
            plugin.validate(config, mode, col);
        }
        const result = plugin.create({ mode, col, config });
        if (!result || !result.$input || !result.$input.length) {
            throw new Error("Field type \"" + type + "\" create() must return { $input: jQuery }");
        }
        result.$input.attr("data-type", type);
        return result;
    };

    CT.mountField = function (opts) {
        const type = opts.config?.type ?? opts.type;
        const plugin = CT.getFieldType(type);
        if (!plugin || typeof plugin.mount !== "function") {
            return;
        }
        plugin.mount(opts);
    };

    /**
     * Which DOM events on a filter control should submit the hidden filter form.
     * Priority: create() return filterEvents → plugin.filterEvents → default ("change" for select, else "input").
     * @returns {string|null} jQuery event string, or null to skip (bindFilterSubmit only)
     */
    CT.resolveFilterEvents = function ({ plugin, $input, createResult }) {
        let events;
        if (createResult && Object.prototype.hasOwnProperty.call(createResult, "filterEvents")) {
            events = createResult.filterEvents;
        } else if (plugin && Object.prototype.hasOwnProperty.call(plugin, "filterEvents")) {
            events = plugin.filterEvents;
        }
        if (events === false || events === null) {
            return null;
        }
        if (typeof events === "string" && events.trim()) {
            return events.trim();
        }
        return $input.is("select") ? "change" : "input";
    };

    CT.normalizeFilterDebounceMs = function (value, fallback) {
        if (value === false) {
            return 0;
        }
        if (value === undefined) {
            return fallback;
        }
        if (value === null) {
            return fallback;
        }
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0) {
            return 0;
        }
        return n;
    };

    /**
     * Resolve debounce delay: column filter.debounceMs → plugin.filterDebounceMs → configure.filterDebounceMs.
     */
    CT.resolveFilterDebounceMs = function ({ filterConfig, plugin }) {
        if (filterConfig && Object.prototype.hasOwnProperty.call(filterConfig, "debounceMs")) {
            // Note: protoColumnConfig.filter.debounceMs defaults to `null`.
            // Treat `null` as "not specified" so we can still fall back to plugin/global.
            if (filterConfig.debounceMs !== null) {
                return CT.normalizeFilterDebounceMs(filterConfig.debounceMs, 0);
            }
        }
        if (plugin && Object.prototype.hasOwnProperty.call(plugin, "filterDebounceMs")) {
            // Same semantics as column debounceMs: null means "unset".
            if (plugin.filterDebounceMs !== null) {
                return CT.normalizeFilterDebounceMs(plugin.filterDebounceMs, 0);
            }
        }
        return CT.normalizeFilterDebounceMs(CT._config.filterDebounceMs, 0);
    };

    /** Debounce filter submit events when debounceMs > 0. */
    CT.shouldDebounceFilterSubmit = function (events, debounceMs) {
        if (!debounceMs || debounceMs <= 0) {
            return false;
        }
        if (!events) {
            return false;
        }
        return true;
    };

    CT.bindFieldFilterSubmit = function (type, $input, onSubmit) {
        const plugin = CT.getFieldType(type);
        if (plugin && typeof plugin.bindFilterSubmit === "function") {
            plugin.bindFilterSubmit($input, onSubmit);
        }
    };

    CT.bindFilterInputEvents = function ({ type, $input, onSubmit, createResult, filterConfig }) {
        const plugin = type ? CT.getFieldType(type) : null;
        const events = CT.resolveFilterEvents({ plugin, $input, createResult });
        const debounceMs = CT.resolveFilterDebounceMs({ filterConfig, plugin });
        const handler = CT.wrapFilterSubmitHandler($input, onSubmit, events, debounceMs);
        if (events) {
            $input.on(events, handler);
        }
        CT.bindFieldFilterSubmit(type, $input, handler);
    };

    CT.isPluggableFieldType = function (type) {
        return !!CT.getFieldType(type);
    };

    /**
     * Simple custom type: fixed HTML element + your mount() to init a widget.
     * @param {( $input: JQuery, options: object, ctx: object) => void} mount
     * @param {{ element: string, formInputClass?: string, skipValueAttr?: boolean, filterEvents?, filterDebounceMs?, validate?, bindFilterSubmit? }} opts
     */
    CT.inputType = function (mount, opts) {
        if (typeof mount !== "function") {
            throw new TypeError("inputType(mount, opts): mount must be a function");
        }
        if (!opts || typeof opts.element !== "string") {
            throw new TypeError("inputType(mount, opts): opts.element is required (HTML string)");
        }
        return {
            filterEvents: opts.filterEvents,
            filterDebounceMs: opts.filterDebounceMs,
            validate: opts.validate,
            create({ mode }) {
                const $input = $(opts.element);
                if (opts.formInputClass && (mode === "insert" || mode === "update")) {
                    $input.addClass(opts.formInputClass);
                }
                return { $input, skipValueAttr: !!opts.skipValueAttr };
            },
            mount(ctx) {
                mount(ctx.$input, ctx.config?.options ?? ctx.config, ctx);
            },
            bindFilterSubmit: opts.bindFilterSubmit,
        };
    };

    CT._getCustomInputTypesConfig = function () {
        return CT._config.customInputTypes ?? CT._config.fieldTypes ?? null;
    };

    CT._syncCustomInputTypes = function () {
        const types = CT._getCustomInputTypesConfig();
        const activeNames =
            types && typeof types === "object"
                ? Object.keys(types).filter((name) => types[name] != null)
                : [];

        CT._configuredCustomInputTypeNames.forEach((name) => {
            if (!activeNames.includes(name)) {
                CT.unregisterFieldType(name);
            }
        });

        activeNames.forEach((name) => {
            const spec = types[name];
            if (!spec || typeof spec !== "object" || typeof spec.create !== "function") {
                if (typeof spec === "function") {
                    throw new Error(
                        "customInputTypes." +
                            name +
                            " is a function — use a plugin, e.g. KGrid.select2(fn) or KGrid.inputType(fn, { element: \"...\" })"
                    );
                }
                throw new TypeError("customInputTypes." + name + " must be a plugin with create()");
            }
            CT.registerFieldType(name, spec, { overwrite: true });
        });

        CT._configuredCustomInputTypeNames = activeNames.slice();
    };
})(window.KGrid);
