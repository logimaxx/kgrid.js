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

    it("uses plugin filterEvents when registered (debounced submit)", () => {
        KGrid.registerFieldType(
            "picker",
            {
                filterEvents: "change",
                create() {
                    return { $input: $("<input type='text' class='form-control form-control-sm'/>") };
                },
            },
            { overwrite: true }
        );
        const { $table } = mountTableShell();
        const opts = tableOptions({
            features: { filtering: true },
            columns: [
                column("x", {
                    features: { filter: true },
                    filter: { type: "picker" },
                }),
            ],
        });
        const $form = KGrid.setupFilterHeader($table, opts);
        const submitSpy = vi.fn();
        $form.on("submit", (e) => {
            e.preventDefault();
            submitSpy();
        });
        const $input = $table.find(".thead-filters input[name='x']");
        vi.useFakeTimers();
        $input.val("a").trigger("input");
        expect(submitSpy).not.toHaveBeenCalled();
        $input.trigger("change");
        expect(submitSpy).not.toHaveBeenCalled();
        vi.advanceTimersByTime(300);
        expect(submitSpy).toHaveBeenCalledOnce();
        vi.useRealTimers();
    });

    it("select filter submits once per change (not input+change) (debounced)", () => {
        const { $table } = mountTableShell();
        const opts = tableOptions({
            features: { filtering: true },
            columns: [
                column("category", {
                    features: { filter: true },
                    filter: {
                        type: "select",
                        operator: "=",
                        options: [
                            { label: "All", value: "" },
                            { label: "A", value: "a" },
                        ],
                    },
                }),
            ],
        });
        const $form = KGrid.setupFilterHeader($table, opts);
        const submitSpy = vi.fn();
        $form.on("submit", (e) => {
            e.preventDefault();
            submitSpy();
        });

        vi.useFakeTimers();
        const $select = $table.find(".thead-filters select[name='category']");
        $select.val("a").trigger("input").trigger("change");
        expect(submitSpy).not.toHaveBeenCalled();
        vi.advanceTimersByTime(300);
        expect(submitSpy).toHaveBeenCalledTimes(1);
        vi.useRealTimers();
    });

    it("debounces text filter input by global filterDebounceMs", () => {
        vi.useFakeTimers();
        const { $table } = mountTableShell();
        const opts = tableOptions({
            features: { filtering: true },
            columns: [
                column("name", {
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

        const $input = $table.find(".thead-filters input[name='name']");
        $input.val("a").trigger("input");
        expect(submitSpy).not.toHaveBeenCalled();
        vi.advanceTimersByTime(299);
        expect(submitSpy).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(submitSpy).toHaveBeenCalledOnce();
        vi.useRealTimers();
    });

    it("column debounceMs: 0 submits text filter immediately", () => {
        const { $table } = mountTableShell();
        const opts = tableOptions({
            features: { filtering: true },
            columns: [
                column("name", {
                    features: { filter: true },
                    filter: { type: "text", debounceMs: 0 },
                }),
            ],
        });
        const $form = KGrid.setupFilterHeader($table, opts);
        const submitSpy = vi.fn();
        $form.on("submit", (e) => {
            e.preventDefault();
            submitSpy();
        });

        $table.find(".thead-filters input[name='name']").val("x").trigger("input");
        expect(submitSpy).toHaveBeenCalledOnce();
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
