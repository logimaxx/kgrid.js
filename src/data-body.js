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
        if(options.pagingFooterAttrs && options.pagingFooterAttrs.constructor===Object) {
            Object.keys(options.pagingFooterAttrs).forEach(att => footer.attr(att,options.pagingFooterAttrs[att]));
        }
        CT.log("noVisibleCols",noVisibleCols);
        footer.find("td").attr("colspan",noVisibleCols);
        return footer;
    };
})(window.KGrid);
