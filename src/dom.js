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

    /** CSS width for a visible column from `attrs.width` (px if numeric). */
    CT.columnWidthCss = function (col) {
        if (!col || !col.attrs) {
            return null;
        }
        const w = col.attrs.width;
        if (w == null || w === "") {
            return null;
        }
        if (typeof w === "number" || /^\d+(\.\d+)?$/.test(String(w))) {
            return String(w) + "px";
        }
        return String(w);
    };

    /** Copy `col.attrs` onto a cell, except layout `width` (that belongs on `<col>`). */
    CT.applyColumnDomAttrs = function ($el, col) {
        const attrs = col && col.attrs && typeof col.attrs === "object" ? col.attrs : null;
        if (!attrs) {
            return $el;
        }
        Object.keys(attrs).forEach(function (attr) {
            if (attr === "width") {
                return;
            }
            $el.attr(attr, attrs[attr]);
        });
        return $el;
    };

    /**
     * Columns that occupy a table-layout slot (named, not schema-hidden, not user-hidden).
     * `display:none` cells do not participate, so colgroup must list only these.
     */
    CT.layoutVisibleColumns = function (columns) {
        return (columns || []).filter(function (col) {
            return col && col.name && !col.hidden && !col.userHidden;
        });
    };

    /** Header/body/footer participating column count (visible data + optional actions). */
    CT.participatingColumnCount = function (columns, hasActions) {
        return CT.layoutVisibleColumns(columns).length + (hasActions ? 1 : 0);
    };

    /**
     * Sync <colgroup> for `table-layout: fixed`.
     * One `<col>` per participating data column, then optional row-actions.
     * Never emit a col for user-hidden fields: `display:none` cells skip a slot,
     * so a leftover col (even width 0) remaps every following cell onto the wrong width.
     * @param {JQuery} $table
     * @param {number} dataColumnCount participating data columns (no row-actions)
     * @param {boolean} hasActions
     * @param {Object} [options] table options (for action column width)
     * @param {Array} [layoutColumns] column objects in display order; userHidden entries are skipped
     */
    CT.syncActionColumnColgroup = function ($table, dataColumnCount, hasActions, options, layoutColumns) {
        let $colgroup = $table.children("colgroup.kgrid-colgroup");
        if (!$colgroup.length) {
            $colgroup = $("<colgroup>").addClass("kgrid-colgroup").prependTo($table);
        }
        $colgroup.empty();
        const named = Array.isArray(layoutColumns) ? layoutColumns : null;
        let emitted = 0;
        if (named && named.length) {
            named.forEach(function (col) {
                if (col && col.userHidden) {
                    return;
                }
                const $col = $("<col>");
                if (col && col.name) {
                    $col.attr("data-name", col.name);
                }
                const cssW = CT.columnWidthCss(col);
                if (cssW) {
                    $col.css("width", cssW);
                }
                $colgroup.append($col);
                emitted += 1;
            });
        } else {
            for (let i = 0; i < dataColumnCount; i++) {
                $colgroup.append($("<col>"));
                emitted += 1;
            }
        }
        if (hasActions) {
            $colgroup.append(
                $("<col>")
                    .addClass("kgrid-row-actions-col")
                    .css("width", CT.actionColumnWidth(options))
            );
        }
        return emitted;
    };

    CT.syncSpanningCells = function ($table, span) {
        if (!$table || !$table.length || !span) {
            return;
        }
        $table.find(".paging-footer td, .no-data-tbody td").attr("colspan", span);
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
