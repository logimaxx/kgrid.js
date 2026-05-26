/**
 * Host-app integration: call KGrid.configure({ ... }) before mounting tables.
 */
(function (CT) {
    const defaultConfig = {
        log: function () {},
        onError: function (err) {
            console.error(err);
        },
        confirm: function (message, onConfirm, onCancel) {
            if (typeof window !== "undefined" && window.confirm(message)) {
                onConfirm();
            } else if (onCancel) {
                onCancel();
            }
        },
        /** @type {((context: object, onConfirm: Function, onCancel?: Function) => void)|null} */
        deleteConfirm: null,
        serializeForm: function (form, columns) {
            const fd = new FormData(form);
            const out = {};
            for (const [key, value] of fd.entries()) {
                if (Object.prototype.hasOwnProperty.call(out, key)) {
                    if (!Array.isArray(out[key])) {
                        out[key] = [out[key]];
                    }
                    out[key].push(value);
                } else {
                    out[key] = value;
                }
            }
            return out;
        },
        select2: null,
        /** @type {Record<string, object>|null} Extra field type plugins */
        fieldTypes: null,
        /** @type {typeof globalThis.KViews|null} Set via configure or use window.KViews */
        kviews: null,
        autosuggest: null,
    };

    CT._config = Object.assign({}, defaultConfig);

    /**
     * @param {Object} overrides
     * @param {Function} [overrides.log]
     * @param {Function} [overrides.onError]
     * @param {Function} [overrides.confirm] (message, onConfirm, onCancel?)
     * @param {Function} [overrides.deleteConfirm] (context, onConfirm, onCancel?) — row delete UX
     * @param {Function} [overrides.serializeForm] (form, columns?)
     * @param {Function} [overrides.select2] ($input, options)
     * @param {Function} [overrides.autosuggest] ($input, options)
     * @param {Object} [overrides.kviews] KViews module (createCollectionInstance)
     * @param {Object} [overrides.fieldTypes] map of name → field type plugin
     */
    CT.configure = function (overrides) {
        if (overrides && typeof overrides === "object") {
            Object.assign(CT._config, overrides);
            if (overrides.fieldTypes) {
                CT._registerConfiguredFieldTypes();
            }
        }
        if (typeof CT._syncIntegrationFieldTypes === "function") {
            CT._syncIntegrationFieldTypes();
        }
        return CT;
    };

    CT.log = function () {
        CT._config.log.apply(null, arguments);
    };

    CT.onError = function (err) {
        return CT._config.onError(err);
    };

    CT.confirm = function (message, onConfirm, onCancel) {
        return CT._config.confirm(message, onConfirm, onCancel);
    };

    CT.DEFAULT_DELETE_CONFIRM_MESSAGE = "Delete this record?";

    CT._defaultDeleteConfirm = function (context, onConfirm, onCancel) {
        CT.confirm(CT.DEFAULT_DELETE_CONFIRM_MESSAGE, onConfirm, onCancel);
    };

    /**
     * Ask the host to confirm row delete. Per-table `options.deleteConfirm` wins over configure.
     * @param {{ item: object, view: object, options?: object }} context
     * @param {() => void} onConfirm run delete (e.g. item.delete())
     * @param {() => void} [onCancel]
     */
    CT.runDeleteConfirm = function (context, onConfirm, onCancel) {
        const perTable =
            context.options && typeof context.options.deleteConfirm === "function"
                ? context.options.deleteConfirm
                : null;
        const configured =
            typeof CT._config.deleteConfirm === "function"
                ? CT._config.deleteConfirm
                : null;
        const fn = perTable || configured || CT._defaultDeleteConfirm;
        return fn(context, onConfirm, onCancel);
    };

    CT.serializeForm = function (form, columns) {
        return CT._config.serializeForm(form, columns);
    };

    CT.wrapSelect2 = function ($input, options) {
        if (typeof CT._config.select2 !== "function") {
            throw new Error("KGrid.configure({ select2: fn }) is required for select2 columns");
        }
        return CT._config.select2($input, options);
    };

    CT.autosuggest = function ($input, options) {
        if (typeof CT._config.autosuggest !== "function") {
            throw new Error("KGrid.configure({ autosuggest: fn }) is required for autosuggest columns");
        }
        return CT._config.autosuggest($input, options);
    };

    /**
     * Resolve KViews from init override, configure({ kviews }), or window.KViews.
     * @param {Object} [override] per-init kviews (opts.kviews)
     * @returns {Object|null}
     */
    CT.getKViews = function (override) {
        const candidates = [override, CT._config.kviews];
        for (let i = 0; i < candidates.length; i++) {
            const kv = candidates[i];
            if (kv && typeof kv.createCollectionInstance === "function") {
                return kv;
            }
        }
        const root = typeof window !== "undefined"
            ? window
            : (typeof globalThis !== "undefined" ? globalThis : {});
        const globalKv = root.KViews;
        if (globalKv && typeof globalKv.createCollectionInstance === "function") {
            return globalKv;
        }
        return null;
    };

    CT.KVIEWS_MISSING_MSG =
        "KGrid requires KViews: install peer @logimaxx/kviews, load it before kgrid.js " +
        "(window.KViews), or call KGrid.configure({ kviews: KViews }). " +
        "You can also pass kviews in table options: KGrid.init(host, { kviews, ... }).";
})(window.KGrid = window.KGrid || {});
