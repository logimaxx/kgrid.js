/**
 * Pluggable field types for filter / insert / update contexts.
 *
 * Register: KGrid.registerFieldType(name, plugin)
 * Or:      KGrid.configure({ fieldTypes: { myType: { ... } } })
 *
 * Plugin shape:
 *   validate?(config, mode, col) — throw on invalid config
 *   create({ mode, col, config }) — { $input: jQuery, skipValueAttr?: boolean }
 *   mount?({ mode, $input, col, config, item?, view?, formEl?, rowEl? })
 *   bindFilterSubmit?($input, onSubmit) — extra events besides input/change (filter only)
 */
(function (CT) {
    CT._fieldTypes = Object.create(null);

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

    CT.bindFieldFilterSubmit = function (type, $input, onSubmit) {
        const plugin = CT.getFieldType(type);
        if (plugin && typeof plugin.bindFilterSubmit === "function") {
            plugin.bindFilterSubmit($input, onSubmit);
        }
    };

    CT.isPluggableFieldType = function (type) {
        return !!CT.getFieldType(type);
    };

    CT._registerConfiguredFieldTypes = function () {
        const types = CT._config.fieldTypes;
        if (!types || typeof types !== "object") {
            return;
        }
        Object.keys(types).forEach((name) => {
            CT.registerFieldType(name, types[name], { overwrite: true });
        });
    };
})(window.KGrid);
