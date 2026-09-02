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
     * Compact width for the row-actions column under table-layout:fixed
     * (fixed layout ignores content; 1% caused overflow). Sized from max buttons
     * shown in any mode (idle clone/delete vs editing save/cancel).
     * @param {Object} [options]
     * @returns {string} CSS width
     */
    CT.actionColumnWidth = function (options) {
        const f = (options && options.features) || {};
        const idle = (f.clone ? 1 : 0) + (f.delete ? 1 : 0);
        const editing = f.update ? 2 : 0;
        const insert = f.create ? 1 : 0;
        const n = Math.max(idle, editing, insert, 1);
        return (2.5 * n + 0.75).toFixed(2) + "rem";
    };

    /**
     * Sync <colgroup> so row-actions width can collapse in view (table-layout: fixed).
     * @param {JQuery} $table
     * @param {number} dataColumnCount visible data columns (no row-actions)
     * @param {boolean} hasActions
     * @param {Object} [options] table options (for action column width)
     */
    CT.syncActionColumnColgroup = function ($table, dataColumnCount, hasActions, options, layoutColumns) {
        let $colgroup = $table.children("colgroup.kgrid-colgroup");
        if (!$colgroup.length) {
            $colgroup = $("<colgroup>").addClass("kgrid-colgroup").prependTo($table);
        }
        $colgroup.empty();
        const named = Array.isArray(layoutColumns) ? layoutColumns : null;
        if (named && named.length) {
            named.forEach(function (col) {
                const $col = $("<col>");
                if (col && col.name) {
                    $col.attr("data-name", col.name);
                }
                if (col && col.userHidden) {
                    $col.addClass("kgrid-user-hidden");
                }
                $colgroup.append($col);
            });
        } else {
            for (let i = 0; i < dataColumnCount; i++) {
                $colgroup.append($("<col>"));
            }
        }
        if (hasActions) {
            $colgroup.append(
                $("<col>")
                    .addClass("kgrid-row-actions-col")
                    .css("width", CT.actionColumnWidth(options))
            );
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
        $el.toggleClass("kgrid-user-hidden", !!col.userHidden);
        return $el;
    };
})(window.KGrid);
