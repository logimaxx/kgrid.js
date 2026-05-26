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
        autosuggest: function ($input, options) {
            const $el = typeof $input === "object" && $input.jquery ? $input : window.jQuery($input);
            if (typeof $el.autosuggest === "function") {
                return $el.autosuggest(options);
            }
            throw new Error("KGrid: jQuery autosuggest plugin is not loaded");
        },
    };

    CT._config = Object.assign({}, defaultConfig);

    /**
     * @param {Object} overrides
     * @param {Function} [overrides.log]
     * @param {Function} [overrides.onError]
     * @param {Function} [overrides.confirm] (message, onConfirm, onCancel?)
     * @param {Function} [overrides.serializeForm] (form, columns?)
     * @param {Function} [overrides.select2] ($input, options)
     * @param {Function} [overrides.autosuggest] ($input, options)
     */
    CT.configure = function (overrides) {
        if (overrides && typeof overrides === "object") {
            Object.assign(CT._config, overrides);
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
        return CT._config.autosuggest($input, options);
    };
})(window.KGrid = window.KGrid || {});
