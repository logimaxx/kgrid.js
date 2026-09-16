import { describe, expect, it } from "vitest";
import { column, mountTableShell, tableOptions } from "./helpers/fixtures.js";

describe("multi_select field type", () => {
    it("builds a checkbox panel instead of a native multiple select", () => {
        const { $table } = mountTableShell();
        KGrid.setupFilterHeader(
            $table,
            tableOptions({
                features: { filtering: true },
                columns: [
                    column("state", {
                        features: { filter: true },
                        filter: {
                            type: "multi_select",
                            options: [
                                { label: "Draft", value: "DRAFT" },
                                { label: "Picked", value: "PICKED" },
                            ],
                        },
                    }),
                ],
            })
        );

        expect($table.find("select[multiple]").length).toBe(0);
        expect($table.find(".kgrid-multi-select").length).toBe(1);
        expect($table.find(".kgrid-multi-select-toggle").length).toBe(1);
        expect($table.find(".kgrid-multi-select-option .kgrid-multi-select-check").length).toBe(2);
        expect($table.find("input.kgrid-multi-select-value[name='state']").length).toBe(1);
        expect($table.find("input[name='state']").attr("data-operator")).toBe("><");
    });

    it("joins checked values with semicolons and submits on change", () => {
        const { $table } = mountTableShell();
        const $form = KGrid.setupFilterHeader(
            $table,
            tableOptions({
                features: { filtering: true },
                columns: [
                    column("state", {
                        features: { filter: true },
                        filter: {
                            type: "multi_select",
                            options: [
                                { label: "Draft", value: "DRAFT" },
                                { label: "Picked", value: "PICKED" },
                                { label: "Shipped", value: "SHIPPED" },
                            ],
                        },
                    }),
                ],
            })
        );

        const submits = [];
        $form.on("submit", function (e) {
            e.preventDefault();
            submits.push($table.find("input[name='state']").val());
        });

        const $boxes = $table.find(".kgrid-multi-select-option input[type='checkbox']");
        $boxes.eq(0).prop("checked", true).trigger("change");
        $boxes.eq(2).prop("checked", true).trigger("change");

        expect($table.find("input[name='state']").val()).toBe("DRAFT;SHIPPED");
        expect(submits).toEqual(["DRAFT", "DRAFT;SHIPPED"]);
        expect($table.find(".kgrid-multi-select-toggle").text()).toBe("2 selected");
    });

    it("accepts array defaults and restores via .val()", () => {
        const { $table } = mountTableShell();
        KGrid.setupFilterHeader(
            $table,
            tableOptions({
                features: { filtering: true },
                columns: [
                    column("state", {
                        features: { filter: true },
                        filter: {
                            type: "multi_select",
                            default: ["DRAFT", "PICKED"],
                            options: [
                                { label: "Draft", value: "DRAFT" },
                                { label: "Picked", value: "PICKED" },
                                { label: "Shipped", value: "SHIPPED" },
                            ],
                        },
                    }),
                ],
            })
        );

        const $input = $table.find("input[name='state']");
        expect($input.val()).toBe("DRAFT;PICKED");
        expect($table.find(".kgrid-multi-select-option input:checked").length).toBe(2);

        $input.val(["SHIPPED"]);
        expect($input.val()).toBe("SHIPPED");
        expect($table.find(".kgrid-multi-select-option input:checked").length).toBe(1);
        expect($table.find(".kgrid-multi-select-option input:checked").val()).toBe("SHIPPED");
    });

    it("normalizeMultiSelectValue joins arrays", () => {
        expect(KGrid.normalizeMultiSelectValue(["a", "b"])).toBe("a;b");
        expect(KGrid.normalizeMultiSelectValue("a;b")).toBe("a;b");
        expect(KGrid.normalizeMultiSelectValue([])).toBe("");
        expect(KGrid.parseMultiSelectValue("a;b")).toEqual(["a", "b"]);
    });
});
