import { describe, expect, it } from "vitest";
import { column, mountTableShell } from "./helpers/fixtures.js";

describe("setupCell", () => {
    it("renders display template in cell-content", () => {
        const $cell = KGrid.setupCell(
            column("title", {
                display: { template: "<strong>{{title}}</strong>", events: [] },
            }),
            null
        );
        expect($cell.find(".cell-content").html()).toContain("<strong>{{title}}</strong>");
        expect($cell.find(".cell-input").length).toBe(1);
    });

    it("creates update input associated with edit form", () => {
        const $form = $("<form id='edit-row-form'>");
        const $cell = KGrid.setupCell(
            column("name", {
                features: { update: true },
                update: { type: "text", events: [] },
            }),
            $form
        );

        const $input = $cell.find(".cell-input input[name='name']");
        expect($input.length).toBe(1);
        expect($input.attr("form")).toBe("edit-row-form");
        expect($input.attr("data-type")).toBe("text");
    });

    it("accepts update input types from VALID_INPUT_TYPES (e.g. file)", () => {
        const $form = $("<form id='f'>");
        const $cell = KGrid.setupCell(
            column("doc", {
                features: { update: true },
                update: { type: "file", events: [] },
            }),
            $form
        );
        expect($cell.find("input[type='file'][name='doc']").length).toBe(1);
    });

    it("throws on invalid update type", () => {
        const $form = $("<form id='f'>");
        expect(() =>
            KGrid.setupCell(
                column("x", {
                    features: { update: true },
                    update: { type: "not-a-real-type", events: [] },
                }),
                $form
            )
        ).toThrow(/Invalid update/);
    });

    it("builds select options without Handlebars helpers", () => {
        const $form = $("<form id='f'>");
        const $cell = KGrid.setupCell(
            column("status", {
                features: { update: true },
                update: {
                    type: "select",
                    options: [
                        { label: "On", value: "1" },
                        { label: "Off", value: "0" },
                    ],
                    events: [],
                },
            }),
            $form
        );
        const html = $cell.find("select[name='status']").html();
        expect(html).not.toMatch(/\{\{#if/);
        expect(html).toContain("On");
        expect($cell.find("select option").length).toBe(2);
    });

    it("displayonly update mode shows template without input control", () => {
        const $form = $("<form id='f'>");
        const $cell = KGrid.setupCell(
            column("status", {
                features: { update: true },
                update: { type: "displayonly", events: [] },
                display: { template: "{{status}}", events: [] },
            }),
            $form
        );
        expect($cell.find(".cell-input input").length).toBe(0);
        expect($cell.find(".cell-input").text()).toContain("{{status}}");
    });

    it("renders checkbox as a flag switch without value from the field template", () => {
        const $form = $("<form id='f'>");
        const $cell = KGrid.setupCell(
            column("lot_tracked", {
                features: { update: true },
                update: { type: "checkbox", events: [] },
            }),
            $form
        );
        const $input = $cell.find(".cell-input input[type='checkbox'][name='lot_tracked']");
        expect($input.length).toBe(1);
        expect($input.attr("role")).toBe("switch");
        expect($input.attr("value")).toBe("1");
        expect($input.closest(".form-check.form-switch").length).toBe(1);
        expect($input.attr("value")).not.toContain("{{");
    });

    it("insert checkbox default 0 stays unchecked; 1 checks the switch", () => {
        const { $table } = mountTableShell({
            features: { create: true },
            insertFormRow: { position: "top" },
        });
        const offCol = KGrid.normalizeColumnConfig(
            column("off_flag", {
                features: { create: true },
                insert: { type: "checkbox", default: "0", events: [] },
            })
        );
        const onCol = KGrid.normalizeColumnConfig(
            column("on_flag", {
                features: { create: true },
                insert: { type: "checkbox", default: "1", events: [] },
            })
        );
        KGrid.setupNewRecordForm(
            $table,
            {
                columns: [offCol, onCol],
                features: { create: true },
                insertFormRow: { position: "top" },
            },
            { instance: { newItem: () => Promise.resolve() } }
        );
        expect($table.find("input[name='off_flag']").prop("checked")).toBe(false);
        expect($table.find("input[name='on_flag']").prop("checked")).toBe(true);
        expect($table.find(".kgrid-flag-switch").length).toBe(2);
    });
});
