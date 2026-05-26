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
        columns.forEach(col => {
            if(col.hidden) {
                return;
            }

            let cell = labelTemplate.clone(true);
            if(col.attrs && typeof col.attrs === 'object') {
                Object.keys(col.attrs).forEach(attr => cell.attr(attr, col.attrs[attr]));
            }

            if(!col.features?.sort) {
                const tmp = cell.empty().html(col.label  ?? "");
                labelsRow.append(tmp);
                return;
            }
            if(!col.name) {
                throw new Error("Column must have a name when column.sortable is true: \n"+JSON.stringify(col,null,2));
            }
            cell.find("span.column-label").text(col.label ?? "");
            cell.children("a").attr("data-sortfld",col.name);
            cell.appendTo(labelsRow);
        });
        if(options.features && (options.features.delete || options.features.create)) {
            $("<th width='100px'>").appendTo(labelsRow);
        }

        return labelsRow;
    };
})(window.KGrid);
