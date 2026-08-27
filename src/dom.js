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
        return !!(f.delete || f.update || f.create || f.clone);
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
