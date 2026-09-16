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

            view.el.find("input[type='checkbox']").each((index, input) => {
                const col = colMap.get(input.name);
                if (!col) {
                    return;
                }
                input.checked = CT.isFlagOn(item.attributes[col.name]);
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

        const ra = CT.resolveRowActions(options);
        CT.mountRowActionDropdowns(view.el);
        const hasClone = ra.menuItems.some((it) => it.action === "clone");
        const hasDelete = ra.menuItems.some((it) => it.action === "delete");

        if (hasClone) {
            view.el.find(".clone-item").off("click").on("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (typeof options.onClone === "function") {
                    options.onClone(item, view, event);
                }
            });
        }

        if (hasDelete) {
            view.el.find(".delete-item").off("click").on("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
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

        const customById = new Map();
        ra.menuItems.forEach((it) => {
            if (it.id && typeof it.callback === "function") {
                customById.set(it.id, it.callback);
            }
        });
        if (customById.size) {
            view.el
                .find("[data-kgrid-action]")
                .off("click.kgridAction")
                .on("click.kgridAction", (event) => {
                    const id = event.currentTarget.getAttribute("data-kgrid-action");
                    const cb = customById.get(id);
                    if (!cb) {
                        return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    cb(event, item, view);
                });
        }

        if (typeof options.onRowFields === "function") {
            options.onRowFields(item, view, table);
        }
    };
})(window.KGrid);
