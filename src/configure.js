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
        /** @type {Record<string, Function|object>|null} name → wrapper fn or field type plugin */
        customInputTypes: null,
        /** @deprecated use customInputTypes */
        fieldTypes: null,
        /** @type {typeof globalThis.KViews|null} Set via configure or use window.KViews */
        kviews: null,
        /** Default delay (ms) before filter submit; 0 = immediate. Applies to the resolved filter-submit event. */
        filterDebounceMs: 300,
    };

    CT._config = Object.assign({}, defaultConfig);

    /**
     * @param {Object} overrides
     * @param {Function} [overrides.log]
     * @param {Function} [overrides.onError]
     * @param {Function} [overrides.confirm] (message, onConfirm, onCancel?)
     * @param {Function} [overrides.deleteConfirm] (context, onConfirm, onCancel?) — row delete UX
     * @param {Function} [overrides.serializeForm] (form, columns?)
     * @param {Object} [overrides.customInputTypes] map of name → wrapper fn or field type plugin
     * @param {Object} [overrides.fieldTypes] deprecated alias of customInputTypes
     * @param {Object} [overrides.kviews] KViews module (createCollectionInstance)
     * @param {number} [overrides.filterDebounceMs] default filter submit debounce (ms); 0 = off
     */
    CT.configure = function (overrides) {
        if (overrides && typeof overrides === "object") {
            Object.assign(CT._config, overrides);
        }
        if (typeof CT._syncCustomInputTypes === "function") {
            CT._syncCustomInputTypes();
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
