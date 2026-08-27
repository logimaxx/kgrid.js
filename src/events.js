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

        if(options.features.clone) {
            view.el.find("button.clone-item").off("click").on("click",(event)=>{
                event.preventDefault();
                if (typeof options.onClone === "function") {
                    options.onClone(item, view, event);
                }
            });
        }

        if(options.features.delete) {
            view.el.find("button.delete-item").off("click").on("click",(event)=>{
                event.preventDefault();
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

        if (typeof options.onRowFields === "function") {
            options.onRowFields(item, view, table);
        }
    };
})(window.KGrid);
