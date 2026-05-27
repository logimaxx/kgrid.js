import { describe, expect, it, vi } from "vitest";
import { column, mountTableShell, tableOptions } from "./helpers/fixtures.js";

describe("field types registry", () => {
    it("registers DOM-only built-ins without external libraries", () => {
        KGrid.configure({ customInputTypes: null });
        expect(KGrid.listFieldTypes()).toContain("multi_select");
        expect(KGrid.listFieldTypes()).toContain("date_range");
        expect(KGrid.listFieldTypes()).not.toContain("select2");
        expect(KGrid.listFieldTypes()).not.toContain("autosuggest");
    });

    it("registers custom input types from configure", () => {
        KGrid.configure({
            customInputTypes: {
                select2: KGrid.select2(vi.fn()),
                autosuggest: KGrid.autosuggest(vi.fn()),
            },
        });
        expect(KGrid.listFieldTypes()).toContain("select2");
        expect(KGrid.listFieldTypes()).toContain("autosuggest");
    });

    it("unregisters custom input types when cleared with null", () => {
        KGrid.configure({
            customInputTypes: {
                select2: KGrid.select2(vi.fn()),
                autosuggest: KGrid.autosuggest(vi.fn()),
            },
        });
        expect(KGrid.getFieldType("select2")).toBeTruthy();

        KGrid.configure({
            customInputTypes: {
                select2: null,
                autosuggest: KGrid.autosuggest(vi.fn()),
            },
        });
        expect(KGrid.getFieldType("select2")).toBeNull();
        expect(KGrid.getFieldType("autosuggest")).toBeTruthy();
    });

    it("rejects a bare function in customInputTypes", () => {
        expect(() =>
            KGrid.configure({
                customInputTypes: {
                    bad: vi.fn(),
                },
            })
        ).toThrow(/KGrid\.select2|KGrid\.inputType/);
    });

    it("inputType builds a mountable plugin", () => {
        const mount = vi.fn();
        KGrid.configure({
            customInputTypes: {
                picker: KGrid.inputType(mount, {
                    element: "<input type='color' class='form-control form-control-sm'/>",
                }),
            },
        });
        const result = KGrid.createFieldInput({
            mode: "filter",
            col: column("hue"),
            config: { type: "picker" },
        });
        expect(result.$input.attr("type")).toBe("color");
        KGrid.mountField({
            mode: "filter",
            $input: result.$input,
            col: column("hue"),
            config: { type: "picker", options: { x: 1 } },
        });
        expect(mount).toHaveBeenCalledWith(result.$input, { x: 1 }, expect.any(Object));
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
});
