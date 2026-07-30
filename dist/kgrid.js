/*! @logimaxx/kgrid | (c) Logimaxx System SRL — proprietary | https://logimaxx.ro | built 2026-07-30T15:32:48.241Z */

/* --- configure.js --- */
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


/* --- constants.js --- */
/**
 * Default table/column config prototypes and allowed input types.
 */
(function (CT) {
    CT.protoOptions = {
        "url": null,
        "type": null,
        filter: null,
        "features": {
            "filtering": false,
            "sorting": false,
            "paging": false,
            "create": false,
            "update": false,
            "delete": false
        },
        "defaultInteraction": "view",
        "insertFormRow": {
            "position": "top"
        },
        "tableAttrs": {
            "class": ""
        },
        "labelsRowAttrs": {

        },
        "dataRowAttrs": {

        },
        "filtersRowAttrs": null,
        /** Page size choices in paging footer <select> */
        pagingPageSizes: [10, 25, 50, 75],
        pagingDefaultSize: 10,
        /** Initial text in .no-data-tbody (overridden by noDataTemplate after init) */
        emptyRowMessage: null,
        pagingFooterLabel: "records per page. Total",
    };

    CT.protoColumnConfig = {
        label: null,
        name: null,
        hidden: false,
        /** CSS class(es) on header/filter/data/insert cells (alias: columnClass) */
        class: null,
        columnClass: null,
        attrs: {},
        features: {
            create: false,
            update: false,
            filter: false,
            sort: false
        },
        display: {
            template: null,
            events: []
        },
        /**
         * Shared insert+update defaults. Explicit insert/update win on conflict.
         * Example: input: { type: "number", required: true }
         */
        input: null,
        insert: {
            type: "text",
            default: null,
            value: null,
            placeholder: null,
            disabled: false,
            required: false,
            options: null,
            events: []
        },
        update: {
            type: "text",
            default: null,
            value: null,
            placeholder: null,
            disabled: false,
            required: false,
            options: null,
            template: null,
            events: []
        },
        filter: {
            type: "text",
            operator: "~=~",
            default: null,
            placeholder: "",
            options: null,
            /** Keep default across filter form reset / re-submit */
            persist: false,
            /** Override KGrid.configure({ filterDebounceMs }); 0 = submit immediately */
            debounceMs: null,
        }
    };

    CT.VALID_NATIVE_INPUT_TYPES = ["displayonly","text","textarea","number","date","datetime","time","checkbox","radio","file","password","email","url","search","tel","select","hidden"];
    /** @deprecated use VALID_NATIVE_INPUT_TYPES or isValidInputType() */
    CT.VALID_INPUT_TYPES = CT.VALID_NATIVE_INPUT_TYPES.slice();
    CT.VALID_NATIVE_FILTER_TYPES = CT.VALID_NATIVE_INPUT_TYPES.filter((t) => t !== "displayonly");
    /** @deprecated use isValidFilterType() */
    CT.VALID_FILTER_TYPES = CT.VALID_NATIVE_FILTER_TYPES.concat(["multi_select","date_range"]);

    CT.isValidInputType = function (type) {
        return CT.VALID_NATIVE_INPUT_TYPES.includes(type) || CT.isPluggableFieldType(type);
    };

    CT.isValidFilterType = function (type) {
        if (type === "displayonly") {
            return false;
        }
        return CT.VALID_NATIVE_FILTER_TYPES.includes(type) || CT.isPluggableFieldType(type);
    };
})(window.KGrid = window.KGrid || {});


/* --- config.js --- */
(function (CT) {
    /** Plain object (not array / null) — realm-safe vs `constructor === Object`. */
    CT.isPlainObject = function (value) {
        return value != null && typeof value === "object" && !Array.isArray(value);
    };

    CT.setDefaultValues = function (proto, col) {
        const newCol = { ...(proto || {}) };
        Object.keys(col || {}).forEach((key) => {
            if (CT.isPlainObject(col[key]) && CT.isPlainObject(newCol[key])) {
                newCol[key] = CT.setDefaultValues(newCol[key], col[key]);
                return;
            }
            if (CT.isPlainObject(col[key]) && newCol[key] == null) {
                newCol[key] = CT.setDefaultValues({}, col[key]);
                return;
            }
            newCol[key] = col[key];
        });
        return newCol;
    };

    /**
     * Normalize a column: expand `input` shorthand, merge proto, ensure events[].
     * @param {Object} col raw column from table options
     * @returns {Object}
     */
    CT.normalizeColumnConfig = function (col) {
        let partial = col && typeof col === "object" ? { ...col } : {};
        if (CT.isPlainObject(partial.input)) {
            const shared = { ...partial.input };
            delete partial.input;
            partial.insert = CT.setDefaultValues(shared, partial.insert || {});
            partial.update = CT.setDefaultValues(shared, partial.update || {});
        }
        const merged = CT.setDefaultValues(CT.protoColumnConfig, partial);
        if (merged.class == null && merged.columnClass) {
            merged.class = merged.columnClass;
        }
        if (
            merged.update &&
            merged.update.type === "displayonly" &&
            !merged.update.template &&
            merged.display &&
            merged.display.template
        ) {
            merged.update.template = merged.display.template;
        }
        ["display", "insert", "update"].forEach((mode) => {
            if (!merged[mode] || typeof merged[mode] !== "object") {
                return;
            }
            if (!Array.isArray(merged[mode].events)) {
                merged[mode].events = [];
            }
        });
        return merged;
    };
})(window.KGrid);


/* --- dom.js --- */
(function (CT) {
    /**
     * Normalize init host: native DOM element or jQuery collection.
     * @param {Element|JQuery} host
     * @returns {JQuery}
     */
    CT.resolveHostElement = function (host) {
        if (host == null) {
            throw new TypeError("KGrid.init(host, opts): host is required");
        }
        if (typeof host === "object" && host.jquery) {
            if (!host.length) {
                throw new Error("KGrid.init(host, opts): empty jQuery selection");
            }
            return host;
        }
        if (
            typeof host === "object" &&
            host.nodeType === 1 &&
            typeof host.nodeName === "string"
        ) {
            return $(host);
        }
        throw new TypeError(
            "KGrid.init(host, opts): host must be a DOM Element or jQuery object"
        );
    };

    CT.uuid = function () {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    };

    /**
     * Whether the table needs a trailing row-actions column (header, filters, data rows, colspan).
     * @param {Object} options table options with features
     * @returns {boolean}
     */
    CT.hasActionColumn = function (options) {
        const f = options && options.features;
        if (!f) {
            return false;
        }
        return !!(f.delete || f.update || f.create);
    };

    /**
     * Sync <colgroup> so row-actions width can collapse in view (table-layout: fixed).
     * @param {JQuery} $table
     * @param {number} dataColumnCount visible data columns (no row-actions)
     * @param {boolean} hasActions
     */
    CT.syncActionColumnColgroup = function ($table, dataColumnCount, hasActions) {
        let $colgroup = $table.children("colgroup.kgrid-colgroup");
        if (!$colgroup.length) {
            $colgroup = $("<colgroup>").addClass("kgrid-colgroup").prependTo($table);
        }
        $colgroup.empty();
        for (let i = 0; i < dataColumnCount; i++) {
            $colgroup.append($("<col>"));
        }
        if (hasActions) {
            $colgroup.append($("<col>").addClass("kgrid-row-actions-col"));
        }
    };

    /**
     * Place a hidden <form> anchor on a table row template.
     * Row controls use form="id" (cannot wrap <tr> in one <form>).
     */
    CT.anchorRowForm = function ($form, $row) {
        if (!$form || !$form.length || !$row || !$row.length) {
            return $form;
        }
        $form.attr("hidden", "hidden").attr("aria-hidden", "true");
        const $firstTd = $row.children("td").first();
        if ($firstTd.length) {
            $form.prependTo($firstTd);
        }
        return $form;
    };

    /** Field in filter row (associated via form="" on control, not nested inside <form>). */
    CT.filterFormField = function (formEl, name) {
        if (!formEl || !name) {
            return $();
        }
        const el = formEl.elements && formEl.elements.namedItem(name);
        if (el) {
            return $(el);
        }
        if (formEl.id) {
            const associated = document.querySelector(`[form="${formEl.id}"][name="${name}"]`);
            if (associated) {
                return $(associated);
            }
        }
        return $();
    };

    /** Resolved CSS class for a column (`class` or alias `columnClass`). */
    CT.columnClassName = function (col) {
        if (!col) {
            return null;
        }
        const cls = col.class != null && col.class !== "" ? col.class : col.columnClass;
        return cls != null && cls !== "" ? String(cls) : null;
    };

    /** Add column class + data-name to a header/cell element. */
    CT.applyColumnCellMeta = function ($el, col) {
        if (!$el || !$el.length || !col) {
            return $el;
        }
        if (col.name) {
            $el.attr("data-name", col.name);
        }
        const cls = CT.columnClassName(col);
        if (cls) {
            $el.addClass(cls);
        }
        return $el;
    };
})(window.KGrid);


/* --- table-shell.js --- */
/**
 * Build the KGrid table DOM skeleton (self-contained; no external HTML file).
 *
 * Edit TABLE_SHELL_TEMPLATE below to change markup. Dynamic slots:
 *   {{EMPTY_ROW_MESSAGE}}  — text in .no-data-tbody
 *   {{PAGES_DATA_PAGESIZE}} — value for .pages data-pagesize
 *   {{PAGE_SIZE_OPTIONS}}  — <option> elements for .pagesize
 *   {{PAGING_FOOTER_LABEL}} — text after page-size select
 */
(function (CT) {
    CT.DEFAULT_EMPTY_ROW_MESSAGE = "No records match your search.";

    /**
     * Static table skeleton (one sortable header cell template; labels.js clones it per column).
     * @type {string}
     */
    CT.TABLE_SHELL_TEMPLATE = `
<table class="custom-table" style="table-layout: fixed;">
  <thead class="thead-labels">
    <tr>
      <th class="align-top">
        <a class="sort" data-sortfld="" style="cursor: pointer;">
          <span class="column-label"></span>
          <i class="fas fa-sort-up sort-up" style="display: none"></i>
          <i class="fas fa-sort-down sort-down" style="display: none"></i>
          <i class="fas fa-sort sort-default"></i>
        </a>
      </th>
    </tr>
  </thead>
  <thead class="thead-filters"></thead>
  <tbody class="before-main-tbody"></tbody>
  <tbody class="main-tbody"></tbody>
  <tbody class="after-main-tbody"></tbody>
  <tbody class="no-data-tbody">
    <tr><td>{{EMPTY_ROW_MESSAGE}}</td></tr>
  </tbody>
  <tfoot class="paging-footer">
    <tr>
      <td>
        <div class="btn-group pages" data-pagesize="{{PAGES_DATA_PAGESIZE}}">
          <button type="button" name="first" class="btn btn-sm btn-outline-secondary">&lt;&lt;</button>
          <button type="button" name="prev" class="btn btn-sm btn-outline-secondary">&lt;</button>
          <button type="button" name="page" class="btn btn-sm btn-outline-secondary">1</button>
          <button type="button" name="next" class="btn btn-sm btn-outline-secondary">&gt;</button>
          <button type="button" name="last" class="btn btn-sm btn-outline-secondary">&gt;&gt;</button>
        </div>
        <select class="pagesize">
{{PAGE_SIZE_OPTIONS}}
        </select>
        {{PAGING_FOOTER_LABEL}} <span class="totalrecscount"></span>
      </td>
    </tr>
  </tfoot>
</table>`.trim();

    CT._escapeTableShellText = function (text) {
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    };

    CT._renderPageSizeOptions = function (pageSizes, defaultSize) {
        return pageSizes
            .map((size) => {
                const value = String(size);
                const selected = value === String(defaultSize) ? " selected" : "";
                return `          <option value="${value}"${selected}>${value}</option>`;
            })
            .join("\n");
    };

    /**
     * Fill template placeholders from table options.
     * @param {Object} options
     * @param {string} [template]
     * @returns {string}
     */
    CT.renderTableShellHtml = function (options, template) {
        const pageSizes = Array.isArray(options.pagingPageSizes)
            ? options.pagingPageSizes
            : [10, 25, 50, 75];
        const defaultSize =
            options.pagingDefaultSize != null ? options.pagingDefaultSize : pageSizes[0];
        const emptyMsg = CT._escapeTableShellText(
            options.emptyRowMessage || CT.DEFAULT_EMPTY_ROW_MESSAGE
        );
        const pagingLabel = CT._escapeTableShellText(
            options.pagingFooterLabel || "records per page. Total"
        );

        return (template || CT.TABLE_SHELL_TEMPLATE)
            .replace(/\{\{EMPTY_ROW_MESSAGE\}\}/g, emptyMsg)
            .replace(/\{\{PAGES_DATA_PAGESIZE\}\}/g, String(defaultSize))
            .replace(
                /\{\{PAGE_SIZE_OPTIONS\}\}/g,
                CT._renderPageSizeOptions(pageSizes, defaultSize)
            )
            .replace(/\{\{PAGING_FOOTER_LABEL\}\}/g, pagingLabel);
    };

    /**
     * Create the table element (not yet attached to document).
     * @param {Object} options merged table options
     * @returns {JQuery} table.custom-table
     */
    CT.createTableShell = function (options) {
        const html = CT.renderTableShellHtml(options);
        const nodes = $.parseHTML(html, document, true);
        const $table = $(nodes).filter("table").first();
        if (!$table.length) {
            throw new Error("KGrid TABLE_SHELL_TEMPLATE must contain a root <table> element");
        }

        if (options.tableAttrs && CT.isPlainObject(options.tableAttrs)) {
            Object.keys(options.tableAttrs).forEach((att) => {
                if (att !== "class") {
                    $table.attr(att, options.tableAttrs[att]);
                }
            });
            if (typeof options.tableAttrs.class === "string" && options.tableAttrs.class) {
                $table.addClass(options.tableAttrs.class);
            }
        }

        return $table;
    };

    /**
     * Ensure host contains a KGrid table; build one if missing.
     * @param {JQuery} $host
     * @param {Object} options
     * @returns {JQuery} table element
     */
    CT.mountTableShell = function ($host, options) {
        const $existing = $host.find("table.custom-table, table").first();
        if ($existing.length) {
            return $existing;
        }

        const $shell = CT.getTableInteractionHost($host);
        if (!$shell.hasClass("custom-table-shell")) {
            $shell.addClass("custom-table-shell");
        }

        const $table = CT.createTableShell(options);
        $shell.append($table);
        return $table;
    };
})(window.KGrid);


/* --- field-types.js --- */
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


/* --- field-types-builtins.js --- */
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


/* --- interaction.js --- */
(function (CT) {
    /** @returns {"view"|"edit"} */
    CT.resolveDefaultInteraction = function (options) {
        if (options.defaultInteraction === "edit" || options.defaultInteraction === "view") {
            return options.defaultInteraction;
        }
        if (options.editmode === true) {
            return "edit";
        }
        if (options.editmode === false) {
            return "view";
        }
        return "view";
    };

    /** Host element that owns interaction CSS (.custom-table-shell). */
    CT.getTableInteractionHost = function ($host) {
        if ($host.hasClass("custom-table-shell")) {
            return $host;
        }
        const $shell = $host.find(".custom-table-shell").first();
        return $shell.length ? $shell : $host;
    };

    CT.applyInteraction = function ($host, mode, overrides) {
        const $shell = CT.getTableInteractionHost($host);
        const interaction = mode === "edit" ? "edit" : "view";
        $shell.attr("data-interaction", interaction);
        if (overrides && typeof overrides === "object") {
            if (overrides.create !== undefined) {
                $shell.attr("data-allow-insert", overrides.create ? "true" : "false");
            }
            if (overrides.update !== undefined) {
                $shell.attr("data-allow-update", overrides.update ? "true" : "false");
            }
            if (overrides.delete !== undefined) {
                $shell.attr("data-allow-delete", overrides.delete ? "true" : "false");
            }
        } else if (interaction === "edit") {
            $shell.removeAttr("data-allow-insert data-allow-update data-allow-delete");
        }
    };
})(window.KGrid);


/* --- labels.js --- */
(function (CT) {
    /**
     * Setup labels row
     * @returns {jQuery}
     */
    CT.setupLabelsHeader = function (labelsThead, options) {
        const labelsRow = labelsThead.children("tr");

        const existingTh = labelsRow.children();
        const labelTemplate = existingTh.first().clone(true);
        existingTh.remove();
        const columns = [...options.columns];
        columns.forEach((col) => {
            if (col.hidden) {
                return;
            }

            let cell = labelTemplate.clone(true);
            if (col.attrs && typeof col.attrs === "object") {
                Object.keys(col.attrs).forEach((attr) => cell.attr(attr, col.attrs[attr]));
            }
            CT.applyColumnCellMeta(cell, col);

            if (!col.features?.sort) {
                const tmp = cell.empty().html(col.label ?? "");
                CT.applyColumnCellMeta(tmp, col);
                labelsRow.append(tmp);
                return;
            }
            if (!col.name) {
                throw new Error(
                    "Column must have a name when column.sortable is true: \n" +
                        JSON.stringify(col, null, 2)
                );
            }
            cell.find("span.column-label").text(col.label ?? "");
            cell.children("a").attr("data-sortfld", col.name);
            cell.appendTo(labelsRow);
        });
        if (CT.hasActionColumn(options)) {
            $("<th>")
                .addClass("kgrid-row-actions")
                .attr("aria-label", "Actions")
                .appendTo(labelsRow);
        }

        return labelsRow;
    };
})(window.KGrid);


/* --- filters.js --- */
(function (CT) {
    const FILTER_DEBOUNCE_TIMER_KEY = "kgridFilterDebounceTimer";

    /**
     * Cancel a pending debounced filter submit on one control.
     * @param {JQuery} $input
     */
    CT.cancelFilterSubmit = function ($input) {
        const timer = $input.data(FILTER_DEBOUNCE_TIMER_KEY);
        if (timer) {
            clearTimeout(timer);
            $input.removeData(FILTER_DEBOUNCE_TIMER_KEY);
        }
    };

    /**
     * Cancel debounced submits for all fields associated with a filter form.
     * @param {HTMLFormElement|JQuery} form
     */
    CT.cancelFilterDebounces = function (form) {
        const formId = $(form).attr("id");
        if (!formId) {
            return;
        }
        $(document)
            .find("[form='" + formId + "']")
            .each(function () {
                CT.cancelFilterSubmit($(this));
            });
    };

    /**
     * Run a pending debounced submit immediately, if any.
     * @param {JQuery} $input
     */
    CT.flushFilterSubmit = function ($input) {
        const timer = $input.data(FILTER_DEBOUNCE_TIMER_KEY);
        if (!timer) {
            return;
        }
        clearTimeout(timer);
        $input.removeData(FILTER_DEBOUNCE_TIMER_KEY);
        const form = $input[0] && $input[0].form;
        if (form) {
            $(form).trigger("submit");
        }
    };

    /**
     * Optionally debounce filter submit (see resolveFilterDebounceMs / shouldDebounceFilterSubmit).
     * @param {JQuery} $input
     * @param {Function} onSubmit bound with control as `this`
     * @param {string|null} events resolved filter events
     * @param {number} debounceMs
     * @returns {Function}
     */
    CT.wrapFilterSubmitHandler = function ($input, onSubmit, events, debounceMs) {
        if (!CT.shouldDebounceFilterSubmit(events, debounceMs)) {
            return onSubmit;
        }
        const delay = debounceMs;
        return function filterSubmitDebounced() {
            CT.cancelFilterSubmit($input);
            const timer = setTimeout(
                function () {
                    $input.removeData(FILTER_DEBOUNCE_TIMER_KEY);
                    onSubmit.call(this);
                }.bind(this),
                delay
            );
            $input.data(FILTER_DEBOUNCE_TIMER_KEY, timer);
        };
    };

    CT.filterDefaultValue = function (defaultSpec) {
        if (defaultSpec != null && typeof defaultSpec === "object" && defaultSpec.value != null) {
            return defaultSpec.value;
        }
        return defaultSpec;
    };

    /** Hidden / persist filters survive reset and stay out of the visible filter row when appropriate. */
    CT.columnFilterPersisted = function (col) {
        const filter = col && col.filter ? col.filter : {};
        return !!(col && (col.hidden || filter.type === "hidden" || filter.persist));
    };

    /**
     * Ensure a named filter field exists on the hidden form (creates hidden input if needed).
     * @returns {HTMLInputElement|null}
     */
    CT.ensureFilterField = function (formEl, name, value, operator) {
        if (!formEl || !name || value == null || value === "") {
            return null;
        }
        let field = formEl.elements && formEl.elements.namedItem(name);
        if (field && field.length != null && !field.tagName) {
            field = field[0];
        }
        if (!field || !field.tagName) {
            field = document.createElement("input");
            field.type = "hidden";
            field.name = name;
            formEl.appendChild(field);
        }
        field.setAttribute("data-operator", operator || "=");
        field.value = String(value);
        field.defaultValue = String(value);
        return field;
    };

    CT.applyColumnDefaultFilters = function (formEl, columns) {
        if (!formEl || !columns) {
            return;
        }
        columns.forEach(function (col) {
            if (!col.name || (col.features && col.features.filter === false)) {
                return;
            }
            const filter = col.filter;
            if (!filter || filter.default == null || filter.default === "") {
                return;
            }
            const value = CT.filterDefaultValue(filter.default);
            if (value == null || value === "") {
                return;
            }
            const operator =
                filter.operator || (CT.columnFilterPersisted(col) ? "=" : "~=~");
            const $existing = CT.filterFormField(formEl, col.name);
            if (col.hidden || filter.type === "hidden" || !$existing.length) {
                CT.ensureFilterField(formEl, col.name, value, operator);
                return;
            }
            if (!$existing.val()) {
                $existing.val(String(value));
                $existing.attr("data-operator", operator);
            }
        });
    };

    /**
     * Re-apply persisted defaults on reset; optionally re-submit when URL lacks them.
     * @param {HTMLFormElement|JQuery} filterFormEl
     * @param {Object} options
     * @param {Object} [collection] KViews collection
     */
    CT.setupDefaultFilters = function (filterFormEl, options, collection) {
        const form = $(filterFormEl)[0];
        if (!form || !options || !options.features || !options.features.filtering) {
            return;
        }
        const columns = options.columns || [];
        CT.applyColumnDefaultFilters(form, columns);

        if (columns.some(CT.columnFilterPersisted)) {
            let resetting = false;
            $(form)
                .off("reset.kgridDefaultFilters")
                .on("reset.kgridDefaultFilters", function (e) {
                    if (resetting) {
                        return;
                    }
                    e.preventDefault();
                    CT.cancelFilterDebounces(form);
                    resetting = true;
                    try {
                        form.reset();
                        CT.applyColumnDefaultFilters(form, columns);
                        if (
                            collection &&
                            collection.filtering &&
                            typeof collection.filtering.handleSubmit === "function"
                        ) {
                            collection.filtering.handleSubmit(form);
                        } else {
                            $(form).trigger("submit");
                        }
                    } finally {
                        resetting = false;
                    }
                });
        }

        if (!collection || !collection.filtering) {
            return;
        }
        const persisted = columns.filter(function (col) {
            return (
                col.name &&
                col.filter &&
                col.filter.default != null &&
                col.filter.default !== "" &&
                CT.columnFilterPersisted(col)
            );
        });
        if (!persisted.length) {
            return;
        }
        const urlFilter = String(
            (collection.url &&
                collection.url.parameters &&
                collection.url.parameters.filter) ||
                ""
        );
        const missing = persisted.some(function (col) {
            return urlFilter.indexOf(col.name + "=") === -1;
        });
        if (missing) {
            collection.filtering.handleSubmit(form);
        }
    };

    /**
     * Setup filtering row.
     * Filter inputs live in <th> cells; they cannot sit inside one <form> in a <tr>.
     * Each control uses the HTML form="" attribute pointing at a hidden <form id="…"> (see setupFilterHeader).
     * @returns {jQuery|null} hidden filter form element (for FilterForm / KViews)
     */
    CT.setupFilterHeader = function (table, options) {
        if (!options.features || !options.features.filtering) {
            return null;
        }
        const theadFilters = table.find(".thead-filters");
        theadFilters.empty();

        const columns = [...options.columns];
        const filtersRow = $("<tr>");
        filtersRow.appendTo(theadFilters);
        const filterFormId = "filter_form_" + CT.uuid();
        const filterForm = $("<form>")
            .attr("id", filterFormId)
            .attr("hidden", "hidden")
            .attr("aria-hidden", "true")
            .addClass("table-filter-form")
            .insertBefore(table);

        columns.forEach((col) => {
            const filter = col.filter || {};
            const skipVisible = col.hidden || filter.type === "hidden";

            if (skipVisible) {
                if (col.features && col.features.filter === false) {
                    return;
                }
                if (!col.name) {
                    return;
                }
                const defVal = CT.filterDefaultValue(filter.default);
                if (defVal != null && defVal !== "") {
                    CT.ensureFilterField(
                        filterForm[0],
                        col.name,
                        defVal,
                        filter.operator || "="
                    );
                } else if (CT.columnFilterPersisted(col)) {
                    CT.ensureFilterField(filterForm[0], col.name, "", filter.operator || "=");
                }
                return;
            }

            let filterCell = $("<th>").appendTo(filtersRow).attr("data-label", col.label);
            CT.applyColumnCellMeta(filterCell, col);

            if (col.features.filter === false) {
                return;
            }
            if (!col.name) {
                throw new Error(
                    "Column must have a name when column.features.filter is true: \n" +
                        JSON.stringify(col, null, 2)
                );
            }

            let input;
            let pluggableResult = null;
            const pluggable = CT.createFieldInput({ mode: "filter", col, config: filter });
            if (pluggable) {
                pluggableResult = pluggable;
                input = pluggable.$input;
                input.appendTo(filterCell);
                CT.mountField({ mode: "filter", $input: input, col, config: filter });
            } else {
                switch (filter.type) {
                    case "select":
                        if (!filter.options) {
                            throw new Error(
                                "Column must have a filter.options array when column.filter.type is select: \n" +
                                    JSON.stringify(col, null, 2)
                            );
                        }
                        input = $("<select>").addClass("form-select form-select-sm");
                        if (Array.isArray(filter.options)) {
                            filter.options.forEach((opt) => {
                                if (!opt.label || typeof opt.value !== "string") {
                                    throw new Error(
                                        "Column must have an filter.options object with label and value when column.filter.type is select: \n" +
                                            JSON.stringify(col, null, 2)
                                    );
                                }
                                $("<option>")
                                    .text(opt.label)
                                    .attr("value", opt.value)
                                    .appendTo(input);
                            });
                        } else {
                            throw new Error(
                                "Column must have a filter.options array when column.filter.type is select: \n" +
                                    JSON.stringify(col, null, 2)
                            );
                        }
                        input.appendTo(filterCell);
                        break;
                    default:
                        if (!CT.isValidFilterType(filter.type)) {
                            throw new Error("Unknown filter type: " + filter.type);
                        }
                        input = $(
                            `<input autocomplete='off' type='${filter.type}' class='form-control form-control-sm'/>`
                        );
                        input.appendTo(filterCell);
                }
            }

            input.attr("data-operator", filter.operator);
            input.attr("form", filterFormId);
            input.attr("name", col.name);

            const defVal = CT.filterDefaultValue(filter.default);
            if (defVal != null && defVal !== "" && !input.val()) {
                input.val(String(defVal));
                input.attr("data-default", String(defVal));
                if (input[0]) {
                    input[0].defaultValue = String(defVal);
                }
            }

            const submitFilterForm = function () {
                const form = this.form;
                if (form) {
                    $(form).trigger("submit");
                }
            };
            CT.bindFilterInputEvents({
                type: filter.type,
                $input: input,
                onSubmit: submitFilterForm,
                createResult: pluggableResult,
                filterConfig: filter,
            });
        });

        if (CT.hasActionColumn(options)) {
            $("<th>")
                .addClass("kgrid-row-actions")
                .attr("data-label", "Actions")
                .appendTo(filtersRow);
        }

        return filterForm;
    };

    CT.FilterForm = function (form) {
        this.form = $(form)[0];
        this.filter = (name, value, operator = "~=~") => {
            if (!this.form) return this;
            let $field = CT.filterFormField(this.form, name);
            if (!$field.length) {
                CT.ensureFilterField(this.form, name, value, operator);
                $field = CT.filterFormField(this.form, name);
            }
            if (!$field.length) return this;
            CT.flushFilterSubmit($field);
            $field.val(value);
            const oldOperator = $field.attr("data-operator");
            $field.attr("data-operator", operator);
            $(this.form).trigger("submit");
            $field.attr("data-operator", oldOperator);
            return this;
        };
        this.ensure = (name, value, operator = "=") => {
            CT.ensureFilterField(this.form, name, value, operator);
            return this;
        };
        this.reset = () => {
            if (this.form) {
                CT.cancelFilterDebounces(this.form);
                this.form.reset();
            }
            return this;
        };
    };
})(window.KGrid);


/* --- cells.js --- */
(function (CT) {
    /**
     * Setup data cell
     * @param {Object} col
     * @param {jQuery} editForm hidden anchor form (fields use form="id")
     * @returns {jQuery}
     */
    CT.setupCell = function (col, editForm) {

        const formId = editForm ? editForm.attr("id") : null;

        const c = {...col };
        const $cell = $("<td>").attr("data-label", col.label);
        CT.applyColumnCellMeta($cell, col);

        const attrs = (c.attrs && typeof c.attrs==="object") ? c.attrs : {};
        Object.keys(attrs).forEach(attr => $cell.attr(attr, attrs[attr]));

        let cellContent = $("<div>").addClass("cell-content");
        cellContent.html(c.display.template ?? `{{${c.name}}}`);
        cellContent.appendTo($cell);

        if (editForm==null ||  !col.features.update) {
            cellContent.clone(true).removeClass('cell-content').addClass('cell-input').appendTo($cell);
            return $cell;
        }

        if(!c.name) {
            throw new Error("Column must have a name when column.features.update is true: \n"+JSON.stringify(col,null,2));
        }

        const updateConfig = c.update;
        const updateType = updateConfig.type ?? "text";
        let input;
        let skipValueAttr = false;

        const pluggable = CT.createFieldInput({ mode: "update", col, config: updateConfig });
        if (pluggable) {
            input = pluggable.$input;
            skipValueAttr = !!pluggable.skipValueAttr;
        } else {
            switch(updateType) {
                case "textarea":
                    input = $(`<textarea class='form-input form-control form-control-sm'>{{${updateConfig.value??c.name}}}</textarea>`);
                    skipValueAttr = true;
                    break;
                case "select":
                    input = $(`<select class='form-input form-control form-control-sm'/>`);
                    if(!Array.isArray(updateConfig.options)) {
                        throw new Error("Select column must have an update.options array when column.features.update is true: \n"+JSON.stringify(col,null,2));
                    }
                    updateConfig.options.forEach((opt) => {
                        if(typeof opt.label !== "string" || typeof opt.value === "undefined") {
                            throw new Error("Select update.options entries need label and value: \n"+JSON.stringify(col,null,2));
                        }
                        $("<option>").text(opt.label).attr("value", opt.value).appendTo(input);
                    });
                    skipValueAttr = true;
                    break;
                case "hidden":
                    input = $(`<input type='hidden' class='form-input form-control form-control-sm'/>`);
                    break;
                case "displayonly": {
                    const tpl =
                        updateConfig.template ||
                        c.display.template ||
                        `{{${c.name}}}`;
                    $("<div>").addClass("cell-input").append(tpl).appendTo($cell);
                    return $cell;
                }
                default:
                    if(CT.isValidInputType(updateType)) {
                        input = $(`<input autocomplete='off' type='${updateType}' class='form-input form-control form-control-sm'/>`);
                    } else {
                        throw new Error("Invalid update updateConfig type: "+JSON.stringify(updateConfig,null,2));
                    }
            }
            input.attr("data-type", updateType);
        }

        if(updateConfig.attrs && typeof updateConfig.attrs === 'object') {
            Object.keys(updateConfig.attrs).forEach(k => input.attr(k, updateConfig.attrs[k]));
        }

        input.attr("form",formId);
        input.attr("name",c.name);
        if (!skipValueAttr && updateType !== "textarea") {
            const rawValue = updateConfig.value ?? `{{${c.name}}}`;
            if (rawValue != null && typeof rawValue !== "object") {
                input.attr("value", rawValue);
            }
        }

        if(c.hidden) {
            input.attr("type","hidden").appendTo(editForm);
            return $cell;
        }


        if(updateConfig.disabled) input.attr("disabled",true);
        if(updateConfig.readonly) input.attr("readonly",true);
        if(updateConfig.required) input.attr("required",true);

        if(updateConfig.attrs && typeof updateConfig.attrs === 'object') {
            Object.keys(updateConfig.attrs).forEach(k => input.attr(k, updateConfig.attrs[k]));
        }
        if(!updateConfig.disabled && !updateConfig.readonly)
            input.attr("onchange","$(this).parents('tr').addClass('editing')");

        $("<div>").addClass("cell-input").append(input).appendTo($cell);
        return $cell;
    };
})(window.KGrid);


/* --- data-body.js --- */
(function (CT) {
    CT.setupNoDataTbody = function (noDataTbody, options, noVisibleCols) {
        const td = noDataTbody.find("td")
            .attr("colspan", noVisibleCols);

        if(options.noDataTemplate) {
            td.html(options.noDataTemplate);
        }
        return td;
    };

    CT.setupDataBody = function (dataBody, options, labelsRow, filterForm, pagingFooter, noDataTbody) {
        const columns = [...options.columns];
        const dataRow = $("<tr>").appendTo(dataBody);
        if(options.dataRowAttrs && typeof options.dataRowAttrs!=="object") {
            throw new Error("options.dataRowAttrs must be an object");
        }
        const dataRowAttrs = {...(options.dataRowAttrs ?? {})};
        Object.keys(dataRowAttrs).forEach(attr => dataRow.attr(attr,dataRowAttrs[attr]));

        {
            dataBody.data("emptyview",noDataTbody);

            if(options?.features?.sorting) {
                dataBody.data("sort",labelsRow);
            }
            if(pagingFooter) {
                dataBody.data("paging",pagingFooter.find(".pages"))
                    .data("pagesizeinp",pagingFooter.find(".pagesize"))
                    .data("totalrecscount",pagingFooter.find(".totalrecscount"));
            }

            if(filterForm) {
                dataBody.data("filter",filterForm);
            }

            if(options.type) {
                dataBody.data("type",options.type);
            }
        }

        const dataRowFormId = "data_row_form_"+CT.uuid()+"_{{this.id}}";
        const editForm = options.features.update
            ? $("<form class='edit-form table-row-form'>").attr("id", dataRowFormId)
            : null;

        columns.forEach(col => {
            const dataCell = CT.setupCell(col,editForm);
            if(!col.hidden) {
                dataCell.appendTo(dataRow);
            }
        });

        if (CT.hasActionColumn(options)) {
            const buttonColumn = $("<td>").addClass("kgrid-row-actions").appendTo(dataRow);
            if(options.features.delete) {
                $("<div>").addClass("btn-group delete-item-grp").appendTo(buttonColumn).append(
                    $("<button>").addClass("btn btn-sm btn-danger delete-item")
                        .attr("type","button")
                        .attr("title","Delete item")
                        .append("<i class='fas fa-trash'></i>"));
            }

            if(options.features.update) {
                const grp = $("<div>").addClass("btn-group edit-item-grp").appendTo(buttonColumn);
                $("<button>").addClass("btn btn-sm btn-success save-item")
                    .attr("type","submit")
                    .attr("name","save")
                    .attr("title","Save item")
                    .attr("form",dataRowFormId)
                    .html("<i class='fas fa-save'></i>")
                    .appendTo(grp);
                $("<button>").addClass("btn btn-sm btn-secondary cancel-edit")
                    .attr("type","button")
                    .attr("name","cancel")
                    .attr("title","Cancel edit")
                    .attr("form",dataRowFormId)
                    .attr("onclick","$(this).parents('[data-type=item]').data().instance.loadFromRemote()")
                    .html("<i class='fas fa-undo'></i>")
                    .appendTo(grp);
            }
        }
        if (editForm) {
            CT.anchorRowForm(editForm, dataRow);
        }

        return dataBody;
    };

    CT.setupPagingFooter = function (footer, options, noVisibleCols) {
        CT.log("setupPagingFooter",footer,options,noVisibleCols);
        if(options.pagingFooterAttrs && CT.isPlainObject(options.pagingFooterAttrs)) {
            Object.keys(options.pagingFooterAttrs).forEach(att => footer.attr(att,options.pagingFooterAttrs[att]));
        }
        CT.log("noVisibleCols",noVisibleCols);
        footer.find("td").attr("colspan",noVisibleCols);
        return footer;
    };
})(window.KGrid);


/* --- insert-row.js --- */
(function (CT) {
    /**
     * Setup new record row
     * @returns {jQuery}
     */
    CT.setupNewRecordForm = function (table, options, grid) {
        if(!options.insertFormRow || !CT.isPlainObject(options.insertFormRow)) {
            table.find(".before-main-tbody").remove();
            table.find(".after-main-tbody").remove();
            return;
        }

        const columns = [...options.columns];

        const newRecordRow = $("<tr>").addClass("new-record-row");
        const position = options.insertFormRow?.position ?? "top";
        if(position==="top") {
            table.find(".after-main-tbody").remove();
            newRecordRow.appendTo(table.find(".before-main-tbody"));
        }
        else {
            table.find(".before-main-tbody").remove();
            newRecordRow.appendTo(table.find(".after-main-tbody"));
        }

        const newRecordFormId = "new_record_row_form_"+CT.uuid();
        const newRecordForm = $("<form class='table-row-form'>").attr("id",newRecordFormId)
            .off("submit").on("submit",(event)=>{
                event.preventDefault();
                const data = CT.serializeForm(event.target, columns);
                Object.keys(data).forEach(key => {
                    if(columns.find(col => col.name === key)?.insert?.dontsave) {
                        delete data[key];
                    }
                });
                grid.instance.newItem(data).then(()=>{
                    event.target.reset();
                    if(typeof options.onNewItemCreated=="function") {
                        options.onNewItemCreated(data);
                    }
                }).catch(CT.onError);
            });

        columns.forEach(col => {

            if(col.hidden) {
                if(options.features?.create && col.features?.create) {
                    const input = $("<input type='hidden'>")
                        .attr("name",col.name)
                        .attr("form",newRecordFormId).appendTo(newRecordForm);
                    if(col.insert.default) {
                        input.val(col.insert.default);
                    }
                }
                return;
            }
            if(!col.features.create){
                const $empty = $("<td>").appendTo(newRecordRow).attr("data-label", col.label);
                CT.applyColumnCellMeta($empty, col);
                return;
            }

            const insertConfig = col.insert;
            if(!insertConfig || !CT.isPlainObject(insertConfig)) {
                throw new Error("Column must have an insert config object when column.features.create is true: \n"+JSON.stringify(col,null,2));
            }

            if(!insertConfig.type) {
                throw new Error("Column must have an insert.type when column.features.insert is true: \n"+JSON.stringify(col,null,2));
            }

            let input;
            const insertType = insertConfig.type ?? "text";
            const pluggable = CT.createFieldInput({ mode: "insert", col, config: insertConfig });
            if (pluggable) {
                input = pluggable.$input;
            } else {
                switch(insertType) {
                    case "textarea":
                        input = $(`<textarea class='form-input form-control form-control-sm'>`);
                        break;
                    case "select":
                        input = $(`<select class='form-input form-control form-control-sm'/>`);
                        if(!insertConfig.options || !Array.isArray(insertConfig.options)) {
                            throw new Error("Column must have an insert.options array when column.features.insert is true: \n"+JSON.stringify(col,null,2));
                        }
                        insertConfig.options.forEach((opt)=>{
                            if(typeof opt.label!="string" || typeof opt.value=="undefined") {
                                throw new Error("Column must have an insert.options object with label and value when column.features.insert is true: \n"+JSON.stringify(col,null,2));
                            }
                            $("<option>").text(opt.label).attr("value",opt.value).appendTo(input);
                        });
                        break;
                    case "hidden":
                        input = $(`<input type='hidden' class='form-input form-control form-control-sm'/>`);
                        break;
                    default:
                        if(CT.isValidInputType(insertType)) {
                            input = $(`<input autocomplete='off' type='${insertType}' class='form-input form-control form-control-sm'/>`);
                        } else {
                            throw new Error("Invalid type: "+JSON.stringify(insertConfig,null,2));
                        }
                        input.attr("data-type", insertType);
                }
            }

            if(insertConfig.default != null && insertConfig.default !== "" && !input.val()) {
                const defVal = (typeof insertConfig.default === "object" && insertConfig.default.value != null)
                    ? insertConfig.default.value
                    : insertConfig.default;
                if(String(defVal).trim()) {
                    input.val(defVal).trigger("change");
                }
            }

            if(insertConfig.attrs && typeof insertConfig.attrs === 'object') {
                Object.keys(insertConfig.attrs).forEach(k => input.attr(k, insertConfig.attrs[k]));
            }

            input.attr("form",newRecordFormId).attr("name",col.name);
            if(insertConfig.disabled) {
                input.attr("disabled",true);
            }
            if(insertConfig.readonly) {
                input.attr("readonly",true);
            }
            if(insertConfig.required) {
                input.attr("required",true);
            }
            if(insertConfig.attrs && typeof insertConfig.attrs === 'object') {
                Object.keys(insertConfig.attrs).forEach(k => input.attr(k, insertConfig.attrs[k]));
            }

            if(insertConfig.type!=="hidden") {
                const $td = $("<td>").append(input).appendTo(newRecordRow).attr("data-label", col.label);
                CT.applyColumnCellMeta($td, col);
            }
            CT.mountField({
                mode: "insert",
                $input: input,
                col,
                config: insertConfig,
                formEl: newRecordForm[0],
                rowEl: newRecordRow[0],
            });
            if(insertConfig.events && Array.isArray(insertConfig.events)) {
                insertConfig.events.forEach(ev=>{
                    input.off(ev.event).on(ev.event, function(e, ...args) {
                        if (typeof ev.callback === "function") ev.callback(e, newRecordForm[0],newRecordRow[0], ...args);
                    });
                });
            }
        });
        CT.anchorRowForm(newRecordForm, newRecordRow);
        const actionColumn = $("<td>")
            .addClass("kgrid-row-actions")
            .appendTo(newRecordRow)
            .attr("data-label", "action");
        const grp = $("<div>").addClass("btn-group").appendTo(actionColumn);
        $("<button>").addClass("btn btn-sm btn-primary new-item-btn")
            .html("<i class='fas fa-plus-square'></i>")
            .attr("form",newRecordFormId)
            .attr("type","submit")
            .appendTo(grp);

        if (typeof options.onInsertRowReady === "function") {
            options.onInsertRowReady(newRecordForm[0], newRecordRow[0]);
        }

        return newRecordRow;
    };
})(window.KGrid);


/* --- events.js --- */
(function (CT) {
    /**
     * Setup events for item after render
     */
    CT.setupEvents = function (item, table, options, colMap) {
        const view = item.views[0];

        options.columns.forEach(col=>{
            col.display.events.forEach(event=>{
                if(!event.selector || !event.event || !event.callback)
                    throw new Error("Invalid event: "+JSON.stringify(event,null,2));

                view.el.find(event.selector).off(event.event).on(event.event,(e)=>{
                    if(typeof event.callback!=="function")
                        throw new Error("Event callback must be a function: "+JSON.stringify(event,null,2));
                    event.callback(e,item,view);
                });
            });

            if(options.features.update) {
                col.update.events.forEach((event)=>{
                    if(!event.event || !event.callback)
                        throw new Error("Invalid event: "+JSON.stringify(event,null,2));

                    view.el.find("[name='"+col.name+"']").off(event.event).on(event.event,function(e,...args){
                        CT.log("event",event,e,this,args);
                        if(typeof event.callback!=="function")
                            throw new Error("Event callback must be a function: "+JSON.stringify(event,null,2));
                        event.callback(e,item,view,...args);
                    });
                });
            }
        });

        if(options.features.update) {
            view.el.find("[data-type]").each((index, el) => {
                const type = el.getAttribute("data-type");
                if (!CT.isPluggableFieldType(type)) {
                    return;
                }
                const col = colMap.get(el.name);
                if (!col?.update) {
                    return;
                }
                CT.mountField({
                    mode: "update",
                    $input: $(el),
                    col,
                    config: col.update,
                    item,
                    view,
                });
            });

            view.el.find("select[data-type='select']").each((index, input) => {
                const col = colMap.get(input.name);
                if (!col) {
                    return;
                }
                const val = item.attributes[col.name];
                if (val == null || val === "") {
                    return;
                }
                $(input).val(typeof val === "boolean" ? String(val) : val);
            });

            view.el.find("form.edit-form").off("submit").on("submit",(event)=>{
                const form = event.target;
                event.preventDefault();
                const instance = $(form).parents("[data-type=item]").data().instance;
                const data = CT.serializeForm(form);
                Object.keys(data).forEach(key => {
                    if(options.columns.find(col => col.name === key)?.update?.dontsave) {
                        delete data[key];
                    }
                });
                instance.update(data).catch(CT.onError);
            });
        }

        if(options.features.delete) {
            view.el.find("button.delete-item").off("click").on("click",(event)=>{
                event.preventDefault();
                view.el.addClass("confirm-delete");
                const clearConfirmState = () => view.el.removeClass("confirm-delete");
                CT.runDeleteConfirm(
                    { item, view, options },
                    () => {
                        item.delete().catch(CT.onError).finally(clearConfirmState);
                    },
                    clearConfirmState
                );
            });
        }

        if (typeof options.onRowFields === "function") {
            options.onRowFields(item, view, table);
        }
    };
})(window.KGrid);


/* --- init.js --- */
(function (CT) {
    /**
     * Initialize a KGrid table inside a host element (DOM node or jQuery).
     * The host may be an empty element; KGrid builds the table DOM when none is present.
     *
     * @param {Element|JQuery} host
     * @param {Object} opts table configuration
     * @returns {Promise<KGridTable>} API: instance, filterForm, setInteraction, …
     */
    CT.init = async function (host, opts) {
        const $host = CT.resolveHostElement(host);
        const options = { ...CT.protoOptions, ...opts };
        const table = CT.mountTableShell($host, options);
        CT.log("table config options", options);

        const initialInteraction = CT.resolveDefaultInteraction(options);
        CT.applyInteraction($host, initialInteraction);

        const api = {
            $host,
            instance: null,
            filterForm: null,
            find(sel) {
                return $host.find(sel);
            },
            setInteraction(mode, overrides) {
                CT.applyInteraction($host, mode, overrides);
                return api;
            },
            getInteraction() {
                const mode = CT.getTableInteractionHost($host).attr("data-interaction");
                return mode === "edit" ? "edit" : "view";
            },
            /** @deprecated prefer setInteraction('edit'|'view') */
            setEditMode(editMode) {
                if (typeof editMode !== "boolean") {
                    throw new TypeError(
                        "setEditMode(editMode) expects a boolean (true = edit, false = view)"
                    );
                }
                return api.setInteraction(editMode ? "edit" : "view");
            },
            /**
             * @deprecated prefer setInteraction('edit'|'view')
             * Boolean: true = edit, false = view. No arg / Event: toggle.
             */
            toggleEditMode(editMode) {
                if (
                    editMode != null &&
                    typeof editMode === "object" &&
                    typeof editMode.preventDefault === "function"
                ) {
                    editMode = undefined;
                }
                if (typeof editMode === "boolean") {
                    return api.setInteraction(editMode ? "edit" : "view");
                }
                return api.setInteraction(api.getInteraction() === "edit" ? "view" : "edit");
            },
        };

        options.columns = options.columns.map((col) => CT.normalizeColumnConfig(col));

        const handlers = options.handlers ?? {};
        delete options.handlers;
        options.columns.forEach((col) => {
            ["insert", "update", "display"].forEach((mode) => {
                const events = col[mode].events;
                if (!events || !Array.isArray(events)) {
                    throw new Error("Column " + col.name + " events are not an array");
                }
                events.forEach((event) => {
                    if (typeof event.callback === "string") {
                        const fn =
                            handlers[event.callback] ||
                            (options.functions && options.functions[event.callback]);
                        if (!fn || typeof fn !== "function") {
                            throw new Error(
                                "Event callback function " +
                                    event.callback +
                                    " not found for column " +
                                    col.name +
                                    " or is not a function"
                            );
                        }
                        event.callback = fn;
                    } else if (typeof event.callback !== "function") {
                        throw new Error(
                            "Event callback must be a function for column " + col.name
                        );
                    }
                });
            });
            const display = col.display;
            if (display && display.events && Array.isArray(display.events)) {
                display.events.forEach((event) => {
                    if (typeof event.callback === "string") {
                        const fn =
                            handlers[event.callback] ||
                            (options.functions && options.functions[event.callback]);
                        if (fn && typeof fn === "function") {
                            event.callback = fn;
                        }
                    }
                });
            }
        });

        const colMap = new Map();
        options.columns.forEach((col) => {
            colMap.set(col.name, col);
        });

        const labelsRow = CT.setupLabelsHeader(table.find(".thead-labels"), options);

        const hasActionColumn = CT.hasActionColumn(options);
        const visibleColumnsCount = labelsRow.find("th").length;
        const dataColumnCount = visibleColumnsCount - (hasActionColumn ? 1 : 0);
        CT.syncActionColumnColgroup(table, dataColumnCount, hasActionColumn);

        const filterForm = options.filterForm ?? CT.setupFilterHeader(table, options);

        let pagingFooter;
        if (options.features && options.features.paging) {
            pagingFooter = CT.setupPagingFooter(
                table.find(".paging-footer"),
                options,
                visibleColumnsCount
            );
        } else {
            pagingFooter = null;
            table.find(".paging-footer").remove();
        }

        const noDataTbody = CT.setupNoDataTbody(
            table.find(".no-data-tbody"),
            options,
            visibleColumnsCount
        );

        if (options.features && options.features.create) {
            CT.setupNewRecordForm(table, options, api);
        }

        api.filterForm = new CT.FilterForm(filterForm);
        const dataBody = CT.setupDataBody(
            table.find(".main-tbody"),
            options,
            labelsRow,
            filterForm,
            pagingFooter,
            noDataTbody
        );

        const KViewOptions = {
            dontload: true,
            setAttrAsId: options.setAttrAsId ?? false,
            itemListeners: {
                afterrender: (item) =>
                    CT.setupEvents(item, api.find("table"), options, colMap),
            },
        };

        const KViews = CT.getKViews(options.kviews);
        if (!KViews) {
            throw new Error(CT.KVIEWS_MISSING_MSG);
        }
        api.instance = await KViews.createCollectionInstance(dataBody, KViewOptions);

        if (options.url) {
            api.instance.setUrl(options.url);
            if (options.deleteUrl) {
                CT.log("set deleteUrl", options.deleteUrl);
                api.instance.setUrl(options.deleteUrl, "delete");
            }
            if (options.updateUrl) {
                CT.log("set updateUrl", options.updateUrl);
                api.instance.setUrl(options.updateUrl, "update");
            }
            if (options.insertUrl) {
                api.instance.setUrl(options.insertUrl, "insert");
            }
            try {
                await api.instance.loadFromRemote();
            } catch (error) {
                CT.onError(error);
            }
        } else if (options.data && options.data.constructor === Array) {
            const dataCopy = options.data.map((item) => ({ attributes: item }));
            api.instance.loadFromData(dataCopy);
        } else {
            throw new Error("Invalid data: missing datasource url or data for table");
        }

        CT.setupDefaultFilters(filterForm, options, api.instance);

        return api;
    };
})(window.KGrid);

