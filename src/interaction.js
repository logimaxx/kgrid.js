(function (CT) {
    /** @returns {"view"|"edit"} */
    CT.resolveDefaultInteraction = function (options) {
        if (options.defaultInteraction === "edit" || options.defaultInteraction === "view") {
            return options.defaultInteraction;
        }
        if (options.editmode === true) {
            return "edit";
        }
        if (options.editmode === false) {
            return "view";
        }
        return "view";
    };

    /** Host element that owns interaction CSS (.custom-table-shell). */
    CT.getTableInteractionHost = function ($host) {
        if ($host.hasClass("custom-table-shell")) {
            return $host;
        }
        const $shell = $host.find(".custom-table-shell").first();
        return $shell.length ? $shell : $host;
    };

    CT.applyInteraction = function ($host, mode, overrides) {
        const $shell = CT.getTableInteractionHost($host);
        const interaction = mode === "edit" ? "edit" : "view";
        $shell.attr("data-interaction", interaction);
        if (overrides && typeof overrides === "object") {
            if (overrides.create !== undefined) {
                $shell.attr("data-allow-insert", overrides.create ? "true" : "false");
            }
            if (overrides.update !== undefined) {
                $shell.attr("data-allow-update", overrides.update ? "true" : "false");
            }
            if (overrides.delete !== undefined) {
                $shell.attr("data-allow-delete", overrides.delete ? "true" : "false");
            }
            if (overrides.clone !== undefined) {
                $shell.attr("data-allow-clone", overrides.clone ? "true" : "false");
            }
        } else if (interaction === "edit") {
            $shell.removeAttr("data-allow-insert data-allow-update data-allow-delete data-allow-clone");
        }
    };
})(window.KGrid);
