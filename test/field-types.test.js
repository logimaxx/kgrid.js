import { describe, expect, it, vi } from "vitest";
import { column, mountTableShell, tableOptions } from "./helpers/fixtures.js";

describe("field types registry", () => {
    it("registers DOM-only built-ins without external libraries", () => {
        KGrid.configure({ select2: null, autosuggest: null });
        expect(KGrid.listFieldTypes()).toContain("multi_select");
        expect(KGrid.listFieldTypes()).toContain("date_range");
        expect(KGrid.listFieldTypes()).not.toContain("select2");
        expect(KGrid.listFieldTypes()).not.toContain("autosuggest");
    });

    it("registers select2 and autosuggest when configured by host", () => {
        KGrid.configure({
            select2: vi.fn(),
            autosuggest: vi.fn(),
        });
        expect(KGrid.listFieldTypes()).toContain("select2");
        expect(KGrid.listFieldTypes()).toContain("autosuggest");
    });

    it("unregisters select2 when configure clears the wrapper", () => {
        KGrid.configure({ select2: vi.fn(), autosuggest: vi.fn() });
        expect(KGrid.getFieldType("select2")).toBeTruthy();

        KGrid.configure({ select2: null, autosuggest: vi.fn() });
        expect(KGrid.getFieldType("select2")).toBeNull();
        expect(KGrid.getFieldType("autosuggest")).toBeTruthy();
    });

    it("allows custom field types via registerFieldType", () => {
        const mount = vi.fn();
        KGrid.registerFieldType(
            "colorpicker",
            {
                create() {
                    return { $input: $("<input type='color' class='form-control form-control-sm'/>") };
                },
                mount,
            },
            { overwrite: true }
        );

        const { $table } = mountTableShell();
        const $form = KGrid.setupFilterHeader(
            $table,
            tableOptions({
                features: { filtering: true },
                columns: [
                    column("hue", {
                        features: { filter: true },
                        filter: { type: "colorpicker" },
                    }),
                ],
            })
        );

        expect($table.find("input[type='color'][name='hue']").length).toBe(1);
        expect(mount).toHaveBeenCalled();
        expect($form).toBeTruthy();
    });

    it("works in insert context without extra registration", () => {
        KGrid.registerFieldType(
            "rating",
            {
                create() {
                    return { $input: $("<input type='range' min='1' max='5'/>") };
                },
            },
            { overwrite: true }
        );

        const result = KGrid.createFieldInput({
            mode: "insert",
            col: column("rating"),
            config: { type: "rating" },
        });
        expect(result.$input.attr("type")).toBe("range");
    });

    it("configure({ fieldTypes }) merges plugins", () => {
        KGrid.configure({
            fieldTypes: {
                stars: {
                    create() {
                        return { $input: $("<input type='number' min='1' max='5'/>") };
                    },
                },
            },
        });

        expect(KGrid.getFieldType("stars")).toBeTruthy();
        expect(typeof KGrid.getFieldType("stars").create).toBe("function");
    });
});
