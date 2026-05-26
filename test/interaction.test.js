import { describe, expect, it } from "vitest";
import { mountTableShell } from "./helpers/fixtures.js";

describe("interaction", () => {
    it("resolveDefaultInteraction prefers defaultInteraction", () => {
        expect(KGrid.resolveDefaultInteraction({ defaultInteraction: "edit" })).toBe(
            "edit"
        );
        expect(KGrid.resolveDefaultInteraction({ defaultInteraction: "view" })).toBe(
            "view"
        );
    });

    it("resolveDefaultInteraction falls back to legacy editmode", () => {
        expect(KGrid.resolveDefaultInteraction({ editmode: true })).toBe("edit");
        expect(KGrid.resolveDefaultInteraction({ editmode: false })).toBe("view");
        expect(KGrid.resolveDefaultInteraction({})).toBe("view");
    });

    it("getTableInteractionHost finds shell inside host", () => {
        mountTableShell();
        const $outer = $("<div>").append($("#kgrid-host").clone());
        expect(KGrid.getTableInteractionHost($outer).hasClass("custom-table-shell")).toBe(
            true
        );
    });

    it("applyInteraction sets data-interaction and optional overrides", () => {
        const { $host } = mountTableShell();
        KGrid.applyInteraction($host, "edit", {
            create: false,
            update: true,
            delete: false,
        });

        expect($host.attr("data-interaction")).toBe("edit");
        expect($host.attr("data-allow-insert")).toBe("false");
        expect($host.attr("data-allow-update")).toBe("true");
        expect($host.attr("data-allow-delete")).toBe("false");
    });

    it("applyInteraction clears allow-* attrs in edit without overrides", () => {
        const { $host } = mountTableShell();
        $host.attr("data-allow-insert", "false");
        KGrid.applyInteraction($host, "edit");
        expect($host.attr("data-allow-insert")).toBeUndefined();
    });
});
