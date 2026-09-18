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
            CT.applyColumnDomAttrs(cell, col);
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
