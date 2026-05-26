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
            view.el.find("input[data-type='autosuggest']").each((index,input)=>{
                const configUpdate = colMap.get(input.name).update;
                if(!configUpdate.options || !configUpdate.options.idFld || !configUpdate.options.labelFld)
                    throw new Error("Invalid autosuggest config: "+JSON.stringify(configUpdate,null,2));
                CT.autosuggest($(input), configUpdate.options);
            });

            view.el.find("select[data-type='select2']").each((index,input)=>{
                const configUpdate = colMap.get(input.name)?.update;
                if(!configUpdate?.options || !configUpdate.options.idFld || !configUpdate.options.labelFld) {
                    throw new Error("Invalid select2 config: "+JSON.stringify(configUpdate,null,2));
                }
                CT.initUpdateSelect2(input, configUpdate);
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

        if(options.features.delete) {
            view.el.find("button.delete-item").off("click").on("click",(event)=>{
                event.preventDefault();
                view.el.addClass("confirm-delete");
                CT.confirm("Confirmi stergerea?",()=>{
                    item.delete().catch(CT.onError).finally(()=>view.el.removeClass("confirm-delete"));
                },()=>{
                    view.el.removeClass("confirm-delete");
                });
            });
        }
    };
})(window.KGrid);
