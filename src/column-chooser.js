/**
 * Column chooser: checkbox visibility + HTML5 drag reorder.
 */
(function (CT) {
    function layoutFromPanel($panel) {
        const columns = [];
        $panel.find(".kgrid-column-chooser-list li[data-name]").each(function () {
            const name = this.getAttribute("data-name");
            const checked = $(this).find("input[type='checkbox']").prop("checked");
            columns.push({ name: name, hidden: !checked });
        });
        return { v: CT.PREFERENCES_VERSION, columns: columns };
    }

    function visibleCount(layout) {
        return layout.columns.filter(function (c) {
            return !c.hidden;
        }).length;
    }

    CT.renderColumnChooserPanel = function ($panel, options, api) {
        $panel.empty();
        const $list = $("<ul>").addClass("kgrid-column-chooser-list").appendTo($panel);
        CT.chooserColumns(options.columns).forEach(function (col) {
            const $li = $("<li>")
                .attr("draggable", "true")
                .attr("data-name", col.name)
                .appendTo($list);
            $("<span>")
                .addClass("kgrid-column-chooser-handle")
                .attr("aria-hidden", "true")
                .text("⋮⋮")
                .appendTo($li);
            const $label = $("<label>").appendTo($li);
            const $cb = $("<input>")
                .attr("type", "checkbox")
                .prop("checked", !col.userHidden)
                .appendTo($label);
            if (col.locked) {
                $cb.prop("disabled", true).attr("title", "This column cannot be hidden");
            }
            $label.append(document.createTextNode(" " + (col.label || col.name)));
        });
        $("<button>")
            .attr("type", "button")
            .addClass("btn btn-sm btn-outline-secondary kgrid-column-chooser-reset")
            .text(options.columnChooserResetLabel || "Reset columns")
            .appendTo($panel);

        $panel
            .off("change.kgridChooser")
            .on("change.kgridChooser", "input[type='checkbox']", function () {
                const layout = layoutFromPanel($panel);
                if (visibleCount(layout) < 1) {
                    this.checked = true;
                    return;
                }
                api.setLayout(layout);
            });

        $panel
            .off("click.kgridChooserReset")
            .on("click.kgridChooserReset", ".kgrid-column-chooser-reset", function () {
                api.resetLayout();
            });

        let dragEl = null;
        $list.off(".kgridChooserDrag");
        $list.on("dragstart.kgridChooserDrag", "li", function (e) {
            dragEl = this;
            $(this).addClass("kgrid-column-chooser-dragging");
            if (e.originalEvent && e.originalEvent.dataTransfer) {
                e.originalEvent.dataTransfer.effectAllowed = "move";
                e.originalEvent.dataTransfer.setData("text/plain", this.getAttribute("data-name"));
            }
        });
        $list.on("dragend.kgridChooserDrag", "li", function () {
            $(this).removeClass("kgrid-column-chooser-dragging");
            dragEl = null;
        });
        $list.on("dragover.kgridChooserDrag", "li", function (e) {
            e.preventDefault();
            if (!dragEl || dragEl === this) {
                return;
            }
            const rect = this.getBoundingClientRect();
            const mid = rect.top + rect.height / 2;
            const clientY = e.originalEvent ? e.originalEvent.clientY : 0;
            if (clientY < mid) {
                this.parentNode.insertBefore(dragEl, this);
            } else {
                this.parentNode.insertBefore(dragEl, this.nextSibling);
            }
        });
        $list.on("drop.kgridChooserDrag", "li", function (e) {
            e.preventDefault();
            api.setLayout(layoutFromPanel($panel));
        });
    };

    CT.setupColumnChooser = function ($host, options, api) {
        if (!options.features || !options.features.columnChooser) {
            return;
        }
        const $shell = CT.getTableInteractionHost($host);
        $shell.find(".kgrid-column-chooser").remove();
        const label = options.columnChooserLabel || "Columns";
        const $wrap = $("<div>").addClass("kgrid-column-chooser");
        const $btn = $("<button>")
            .attr("type", "button")
            .addClass("kgrid-column-chooser-toggle btn btn-sm btn-outline-secondary")
            .attr("title", label)
            .attr("aria-expanded", "false")
            .attr("aria-haspopup", "true")
            .html(
                '<i class="fas fa-table-columns" aria-hidden="true"></i>' +
                    '<span class="kgrid-column-chooser-toggle-label"> ' +
                    $("<div>").text(label).html() +
                    "</span>"
            );
        const $panel = $("<div>")
            .addClass("kgrid-column-chooser-panel")
            .attr("hidden", "hidden");
        $wrap.append($btn, $panel);
        $shell.prepend($wrap);
        CT.renderColumnChooserPanel($panel, options, api);

        function close() {
            $panel.attr("hidden", "hidden");
            $btn.attr("aria-expanded", "false");
        }

        $btn.on("click", function (e) {
            e.stopPropagation();
            const open = !$panel.attr("hidden");
            if (open) {
                close();
            } else {
                $panel.removeAttr("hidden");
                $btn.attr("aria-expanded", "true");
            }
        });

        const ns = "kgridChooser" + CT.uuid();
        $(document).on("pointerdown." + ns, function (e) {
            if (!document.body.contains($wrap[0])) {
                $(document).off("pointerdown." + ns);
                return;
            }
            if (!$wrap[0].contains(e.target)) {
                close();
            }
        });
    };
})(window.KGrid);
