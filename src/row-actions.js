/**
 * Declarative row actions: menu items (delete/clone/custom) + auto save/cancel from features.update.
 */
(function (CT) {
    CT.BUILTIN_ROW_ACTIONS = {
        clone: {
            action: "clone",
            icon: "fa-regular fa-copy",
            label: "Clone",
            title: "Clone item",
            when: "idle",
            btnClass: "btn btn-sm btn-outline-secondary clone-item",
            groupClass: "clone-item-grp",
        },
        delete: {
            action: "delete",
            icon: "fas fa-trash",
            label: "Delete",
            title: "Delete item",
            when: "idle",
            btnClass: "btn btn-sm btn-danger delete-item",
            groupClass: "delete-item-grp",
        },
        save: {
            action: "save",
            icon: "fas fa-save",
            label: "Save",
            title: "Save item",
            when: "editing",
            btnClass: "btn btn-sm btn-success save-item",
            groupClass: "edit-item-grp",
        },
        cancel: {
            action: "cancel",
            icon: "fas fa-undo",
            label: "Cancel",
            title: "Cancel edit",
            when: "editing",
            btnClass: "btn btn-sm btn-secondary cancel-edit",
            groupClass: "edit-item-grp",
        },
    };

    function warn(msg) {
        if (typeof console !== "undefined" && typeof console.warn === "function") {
            console.warn(msg);
        }
    }

    function resolveHandler(name, handlers, options) {
        if (!name || typeof name !== "string") {
            return null;
        }
        const fn =
            (handlers && handlers[name]) ||
            (options.functions && options.functions[name]);
        return typeof fn === "function" ? fn : null;
    }

    /**
     * Merge a raw item with builtin defaults (or treat as custom).
     * @param {Object} raw
     * @param {Object} [handlers]
     * @param {Object} options
     * @returns {Object|null}
     */
    CT.normalizeRowActionItem = function (raw, handlers, options) {
        if (!raw || typeof raw !== "object") {
            return null;
        }
        const action = raw.action;
        if (action === "save" || action === "cancel") {
            warn(
                "KGrid: rowActions items should not list '" +
                    action +
                    "' — it is added automatically when features.update is true"
            );
            return null;
        }
        let base = {};
        if (action && CT.BUILTIN_ROW_ACTIONS[action]) {
            base = { ...CT.BUILTIN_ROW_ACTIONS[action] };
        } else if (!raw.id) {
            warn("KGrid: custom rowAction requires id: " + JSON.stringify(raw));
            return null;
        } else {
            base = {
                id: raw.id,
                when: "idle",
                btnClass: "btn btn-sm btn-outline-secondary",
                groupClass: "kgrid-custom-action-grp",
            };
        }

        const item = { ...base, ...raw };
        if (action && CT.BUILTIN_ROW_ACTIONS[action]) {
            item.action = action;
        }
        if (!item.when) {
            item.when = item.action ? base.when || "idle" : "idle";
        }
        if (!item.title && item.label) {
            item.title = item.label;
        }
        if (!item.label && item.title) {
            item.label = item.title;
        }
        if (typeof item.callback === "string") {
            const fn = resolveHandler(item.callback, handlers, options);
            if (!fn) {
                throw new Error(
                    "rowAction callback " + item.callback + " not found or is not a function"
                );
            }
            item.callback = fn;
        }
        if (item.id && typeof item.callback !== "function" && !item.action) {
            throw new Error("Custom rowAction '" + item.id + "' requires a callback");
        }
        return item;
    };

    /**
     * Resolve and cache rowActions on options.
     * @param {Object} options
     * @param {Object} [handlers]
     * @returns {{ display: string, menuItems: Object[], editingItems: Object[] }}
     */
    CT.resolveRowActions = function (options, handlers) {
        if (options && options._resolvedRowActions && arguments.length < 2) {
            return options._resolvedRowActions;
        }
        const f = (options && options.features) || {};
        let display = "buttons";
        let rawItems = [];

        if (options && options.rowActions != null) {
            const ra = options.rowActions;
            if (Array.isArray(ra)) {
                rawItems = ra;
            } else if (CT.isPlainObject(ra)) {
                display = ra.display === "dropdown" ? "dropdown" : "buttons";
                rawItems = Array.isArray(ra.items) ? ra.items : [];
            }
            if (f.delete || f.clone) {
                warn(
                    "KGrid: features.delete / features.clone are ignored when rowActions is set"
                );
            }
        } else {
            if (f.clone) {
                rawItems.push({ action: "clone" });
            }
            if (f.delete) {
                rawItems.push({ action: "delete" });
            }
        }

        const menuItems = [];
        rawItems.forEach(function (raw) {
            const item = CT.normalizeRowActionItem(raw, handlers, options || {});
            if (item) {
                menuItems.push(item);
            }
        });

        const editingItems = [];
        if (f.update) {
            editingItems.push({ ...CT.BUILTIN_ROW_ACTIONS.save });
            editingItems.push({ ...CT.BUILTIN_ROW_ACTIONS.cancel });
        }

        const resolved = { display: display, menuItems: menuItems, editingItems: editingItems };
        if (options) {
            options._resolvedRowActions = resolved;
        }
        return resolved;
    };

    /**
     * Whether the table needs a trailing row-actions column.
     * @param {Object} options
     * @returns {boolean}
     */
    CT.hasActionColumn = function (options) {
        const f = options && options.features;
        if (f && f.create) {
            return true;
        }
        const ra = CT.resolveRowActions(options);
        return ra.menuItems.length > 0 || ra.editingItems.length > 0;
    };

    /**
     * Compact width for the row-actions column under table-layout:fixed.
     * @param {Object} [options]
     * @returns {string} CSS width
     */
    CT.actionColumnWidth = function (options) {
        const ra = CT.resolveRowActions(options);
        const f = (options && options.features) || {};
        const editing = ra.editingItems.length;
        const insert = f.create ? 1 : 0;
        let idle;
        if (ra.display === "dropdown" && ra.menuItems.length > 0) {
            idle = 1;
        } else {
            idle = ra.menuItems.filter(function (it) {
                return it.when !== "editing";
            }).length;
        }
        const n = Math.max(idle, editing, insert, 1);
        return (2.5 * n + 0.75).toFixed(2) + "rem";
    };

    CT.closeRowActionDropdowns = function ($exceptMenu) {
        $(".kgrid-row-actions-menu").each(function () {
            const $wrap = $(this);
            const $menu = $wrap.children(".dropdown-menu");
            if ($exceptMenu && $menu[0] === $exceptMenu[0]) {
                return;
            }
            $menu.removeClass("show").css({ top: "", left: "", right: "", position: "" });
            $wrap.children(".kgrid-actions-dropdown-toggle").attr("aria-expanded", "false").removeClass("show");
        });
    };

    /**
     * Wire row-action kebab menus. Uses a small jQuery toggle (not Bootstrap Dropdown)
     * so we do not depend on data-api / popperConfig quirks; menu is position:fixed while open.
     * @param {JQuery} $root
     */
    CT.mountRowActionDropdowns = function ($root) {
        if (!$root || !$root.length) {
            return;
        }
        if (!CT._rowActionsDropdownDocBound) {
            CT._rowActionsDropdownDocBound = true;
            $(document)
                .on("click.kgridRowActions", function () {
                    CT.closeRowActionDropdowns();
                })
                .on("keydown.kgridRowActions", function (e) {
                    if (e.key === "Escape") {
                        CT.closeRowActionDropdowns();
                    }
                });
        }
        $root.find(".kgrid-row-actions-menu > .kgrid-actions-dropdown-toggle").each(function () {
            const toggle = this;
            const $toggle = $(toggle);
            const $wrap = $toggle.parent(".kgrid-row-actions-menu");
            const $menu = $wrap.children(".dropdown-menu");
            $toggle.off("click.kgridRowActions").on("click.kgridRowActions", function (event) {
                event.preventDefault();
                event.stopPropagation();
                const willOpen = !$menu.hasClass("show");
                CT.closeRowActionDropdowns();
                if (!willOpen) {
                    return;
                }
                const rect = toggle.getBoundingClientRect();
                $menu.addClass("show").css({
                    position: "fixed",
                    top: Math.round(rect.bottom + 2) + "px",
                    left: "auto",
                    right: Math.round(window.innerWidth - rect.right) + "px",
                    zIndex: 1055,
                });
                $toggle.addClass("show").attr("aria-expanded", "true");
            });
            $menu.off("click.kgridRowActions").on("click.kgridRowActions", function (event) {
                event.stopPropagation();
            });
            $menu.find(".dropdown-item").off("click.kgridRowActionsClose").on("click.kgridRowActionsClose", function () {
                // Close after the action click handlers (same tick is fine).
                setTimeout(function () {
                    CT.closeRowActionDropdowns();
                }, 0);
            });
        });
    };

    function iconHtml(icon) {
        if (!icon) {
            return "";
        }
        return "<i class='" + icon + "'></i>";
    }

    function appendButton($parent, item, dataRowFormId) {
        const $btn = $("<button>")
            .addClass(item.btnClass || "btn btn-sm btn-outline-secondary")
            .attr("type", item.action === "save" ? "submit" : "button")
            .attr("title", item.title || item.label || "");
        if (item.class) {
            $btn.addClass(item.class);
        }
        if (item.action === "save" || item.action === "cancel") {
            $btn.attr("name", item.action === "save" ? "save" : "cancel");
            if (dataRowFormId) {
                $btn.attr("form", dataRowFormId);
            }
        }
        if (item.action === "cancel") {
            $btn.attr(
                "onclick",
                "$(this).parents('[data-type=item]').data().instance.loadFromRemote()"
            );
        }
        if (item.id) {
            $btn.attr("data-kgrid-action", item.id);
        }
        if (item.action) {
            $btn.attr("data-kgrid-builtin", item.action);
        }
        if (item.icon) {
            $btn.html(iconHtml(item.icon));
            if (item.showLabel && item.label) {
                $btn.append(document.createTextNode(" " + item.label));
            }
        } else if (item.label) {
            $btn.text(item.label);
        }
        $btn.appendTo($parent);
        return $btn;
    }

    /** Minimal escape for button text (labels). */
    CT.escapeHtml = CT.escapeHtml || function (str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    };

    /**
     * Fill .kgrid-row-actions cell for a data row template.
     * @param {JQuery} $buttonColumn
     * @param {Object} options
     * @param {string|null} dataRowFormId
     */
    CT.renderRowActions = function ($buttonColumn, options, dataRowFormId) {
        const ra = CT.resolveRowActions(options);
        const idleItems = ra.menuItems.filter(function (it) {
            return it.when !== "editing";
        });
        const editingExtras = ra.menuItems.filter(function (it) {
            return it.when === "editing";
        });

        if (ra.display === "dropdown" && idleItems.length > 0) {
            const $menuWrap = $("<div>")
                .addClass("btn-group kgrid-row-actions-menu")
                .appendTo($buttonColumn);
            $("<button>")
                .addClass("btn btn-sm btn-outline-secondary dropdown-toggle kgrid-actions-dropdown-toggle")
                .attr({
                    type: "button",
                    "aria-expanded": "false",
                    title: "Actions",
                })
                .html("<i class='fas fa-ellipsis-v'></i>")
                .appendTo($menuWrap);
            const $menu = $("<ul>")
                .addClass("dropdown-menu dropdown-menu-end")
                .appendTo($menuWrap);
            idleItems.forEach(function (item) {
                const $li = $("<li>").appendTo($menu);
                const $a = $("<button>")
                    .addClass("dropdown-item")
                    .attr("type", "button")
                    .appendTo($li);
                if (item.action === "clone") {
                    $a.addClass("clone-item");
                } else if (item.action === "delete") {
                    $a.addClass("delete-item text-danger");
                }
                if (item.id) {
                    $a.attr("data-kgrid-action", item.id);
                }
                if (item.action) {
                    $a.attr("data-kgrid-builtin", item.action);
                }
                if (item.class) {
                    $a.addClass(item.class);
                }
                if (item.btnClass && !item.action) {
                    // Custom items may pass btnClass meant for button mode; keep danger etc. as text color hints.
                    if (/\bbtn-danger\b|\btext-danger\b|\boutline-danger\b/.test(item.btnClass)) {
                        $a.addClass("text-danger");
                    }
                }
                const label = item.label || item.title || item.action || item.id;
                if (item.icon) {
                    $a.html(iconHtml(item.icon) + " " + CT.escapeHtml(label));
                } else {
                    $a.text(label);
                }
            });
        } else {
            idleItems.forEach(function (item) {
                const $grp = $("<div>")
                    .addClass(item.groupClass || "btn-group kgrid-custom-action-grp")
                    .appendTo($buttonColumn);
                if (item.when === "always") {
                    $grp.addClass("kgrid-action-always");
                }
                appendButton($grp, item, dataRowFormId);
            });
        }

        const editingAll = ra.editingItems.concat(editingExtras);
        if (editingAll.length) {
            const $grp = $("<div>").addClass("btn-group edit-item-grp").appendTo($buttonColumn);
            editingAll.forEach(function (item) {
                appendButton($grp, item, dataRowFormId);
            });
        }
    };
})(window.KGrid);
