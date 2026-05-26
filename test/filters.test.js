import { describe, expect, it, vi } from "vitest";
import { column, mountTableShell, tableOptions } from "./helpers/fixtures.js";

describe("setupFilterHeader", () => {
    it("returns null when filtering disabled", () => {
        const { $table } = mountTableShell();
        const form = KGrid.setupFilterHeader($table, tableOptions());
        expect(form).toBeNull();
        expect($table.find(".thead-filters tr").length).toBe(0);
    });

    it("builds filter row with text inputs linked to hidden form", () => {
        const { $table } = mountTableShell();
        const opts = tableOptions({
            features: { filtering: true },
            columns: [
                column("name", {
                    features: { filter: true },
                    filter: { type: "text", operator: "~=~" },
                }),
            ],
        });

        const $form = KGrid.setupFilterHeader($table, opts);
        expect($form).toBeTruthy();
        expect($form.attr("hidden")).toBe("hidden");

        const $input = $table.find(".thead-filters input[name='name']");
        expect($input.length).toBe(1);
        expect($input.attr("form")).toBe($form.attr("id"));
        expect($input.attr("data-operator")).toBe("~=~");
    });

    it("FilterForm.filter sets value and submits", () => {
        const { $table } = mountTableShell();
        const opts = tableOptions({
            features: { filtering: true },
            columns: [
                column("q", {
                    features: { filter: true },
                    filter: { type: "text" },
                }),
            ],
        });
        const $form = KGrid.setupFilterHeader($table, opts);
        const submitSpy = vi.fn();
        $form.on("submit", (e) => {
            e.preventDefault();
            submitSpy();
        });

        const ff = new KGrid.FilterForm($form);
        ff.filter("q", "needle", "=");
        expect($table.find("input[name='q']").val()).toBe("needle");
        expect(submitSpy).toHaveBeenCalled();
    });
});
