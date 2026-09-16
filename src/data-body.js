(function (CT) {
    CT.setupNoDataTbody = function (noDataTbody, options, noVisibleCols) {
        const td = noDataTbody.find("td")
            .attr("colspan", noVisibleCols);

        if(options.noDataTemplate) {
            td.html(options.noDataTemplate);
        }
        return td;
    };

    /**
     * Fill a data <tr> with cells + optional row-actions (KViews item template).
     * @param {JQuery} dataRow
     * @param {Object} options
     * @returns {JQuery} dataRow
     */
    CT.fillDataRow = function (dataRow, options) {
        const columns = [...options.columns];
        const dataRowFormId = "data_row_form_"+CT.uuid()+"_{{this.id}}";
        const editForm = options.features && options.features.update
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
            CT.renderRowActions(buttonColumn, options, dataRowFormId);
        }
        if (editForm) {
            CT.anchorRowForm(editForm, dataRow);
        }
        return dataRow;
    };

    CT.setupDataBody = function (dataBody, options, labelsRow, filterForm, pagingFooter, noDataTbody) {
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

        CT.fillDataRow(dataRow, options);
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
