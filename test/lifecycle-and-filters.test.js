import { afterEach, describe, expect, it, vi } from "vitest";
import {
    column,
    initKGrid,
    mockKViews,
    mountTableHost,
    mountTableShell,
    tableOptions,
} from "./helpers/fixtures.js";

describe("column class + lifecycle hooks", () => {
    afterEach(() => {
        delete globalThis.KViews;
        document.body.innerHTML = "";
    });

    it("applies column.class to label, filter, and data cells with data-name", () => {
        const { $table } = mountTableShell();
        const opts = tableOptions({
            features: { filtering: true, update: true },
            columns: [
                column("qty_mode", {
                    label: "Mod",
                    class: "col-advanced",
                    features: { filter: true, update: true },
                    filter: { type: "text" },
                    update: { type: "text", events: [] },
                }),
            ],
        });
        opts.columns = opts.columns.map((c) => KGrid.normalizeColumnConfig(c));

        const labelsRow = KGrid.setupLabelsHeader($table.find(".thead-labels"), opts);
        expect(labelsRow.find("th[data-name='qty_mode']").hasClass("col-advanced")).toBe(true);

        KGrid.setupFilterHeader($table, opts);
        expect(
            $table.find(".thead-filters th[data-name='qty_mode']").hasClass("col-advanced")
        ).toBe(true);

        const $form = $("<form id='edit-f'>");
        const $cell = KGrid.setupCell(opts.columns[0], $form);
        expect($cell.attr("data-name")).toBe("qty_mode");
        expect($cell.hasClass("col-advanced")).toBe(true);
    });

    it("accepts columnClass alias", () => {
        const col = KGrid.normalizeColumnConfig(
            column("x", { columnClass: "col-x", label: "X" })
        );
        expect(col.class).toBe("col-x");
        expect(KGrid.columnClassName(col)).toBe("col-x");
    });

    it("calls onRowFields after setupEvents", () => {
        const onRowFields = vi.fn();
        const item = {
            views: [{ el: $("<tr><td></td></tr>") }],
            attributes: {},
            delete: vi.fn(),
        };
        const opts = tableOptions({
            features: { update: false, delete: false },
            onRowFields,
            columns: [column("name")],
        });
        opts.columns = opts.columns.map((c) => KGrid.normalizeColumnConfig(c));
        const colMap = new Map(opts.columns.map((c) => [c.name, c]));

        KGrid.setupEvents(item, $("<table>"), opts, colMap);

        expect(onRowFields).toHaveBeenCalledOnce();
        expect(onRowFields.mock.calls[0][0]).toBe(item);
        expect(onRowFields.mock.calls[0][1]).toBe(item.views[0]);
    });

    it("calls onInsertRowReady after building insert row", async () => {
        const { $host } = mountTableHost();
        mockKViews();
        const onInsertRowReady = vi.fn();

        await initKGrid(
            $host,
            tableOptions({
                features: { create: true },
                insertFormRow: { position: "top" },
                onInsertRowReady,
                columns: [
                    column("name", {
                        features: { create: true },
                        insert: { type: "text", events: [] },
                    }),
                ],
            })
        );

        expect(onInsertRowReady).toHaveBeenCalledOnce();
        const [form, row] = onInsertRowReady.mock.calls[0];
        expect(form.tagName).toBe("FORM");
        expect(row.tagName).toBe("TR");
    });
});

describe("normalizeColumnConfig", () => {
    it("expands input shorthand into insert and update", () => {
        const col = KGrid.normalizeColumnConfig({
            name: "qty",
            label: "Qty",
            input: { type: "number", required: true },
            update: { value: "{{qty}}" },
        });
        expect(col.insert.type).toBe("number");
        expect(col.insert.required).toBe(true);
        expect(col.update.type).toBe("number");
        expect(col.update.value).toBe("{{qty}}");
        expect(col.insert.events).toEqual([]);
        expect(col.update.events).toEqual([]);
    });

    it("copies display.template onto displayonly update when missing", () => {
        const col = KGrid.normalizeColumnConfig({
            name: "btn",
            display: { template: "<button>x</button>" },
            update: { type: "displayonly" },
        });
        expect(col.update.template).toBe("<button>x</button>");
    });

    it("allows omitting events arrays", async () => {
        const { $host } = mountTableHost();
        mockKViews();
        await expect(
            initKGrid(
                $host,
                tableOptions({
                    features: { create: true, update: true },
                    columns: [
                        {
                            name: "name",
                            label: "Name",
                            features: { create: true, update: true },
                            insert: { type: "text" },
                            update: { type: "text" },
                        },
                    ],
                })
            )
        ).resolves.toBeTruthy();
    });
});

describe("default / persist filters", () => {
    afterEach(() => {
        delete globalThis.KViews;
        document.body.innerHTML = "";
    });

    it("injects hidden filter fields for hidden persist columns", () => {
        const { $table } = mountTableShell();
        const opts = tableOptions({
            features: { filtering: true },
            columns: [
                column("company_id", {
                    hidden: true,
                    features: { filter: true },
                    filter: {
                        type: "hidden",
                        operator: "=",
                        default: "42",
                        persist: true,
                    },
                }),
                column("name", {
                    features: { filter: true },
                    filter: { type: "text", operator: "~=~" },
                }),
            ],
        });
        opts.columns = opts.columns.map((c) => KGrid.normalizeColumnConfig(c));

        const $form = KGrid.setupFilterHeader($table, opts);
        const field = $form[0].elements.namedItem("company_id");
        expect(field).toBeTruthy();
        expect(field.type).toBe("hidden");
        expect(field.value).toBe("42");
        expect(field.getAttribute("data-operator")).toBe("=");
        expect($table.find(".thead-filters input[name='company_id']").length).toBe(0);
        expect($table.find(".thead-filters input[name='name']").length).toBe(1);
    });

    it("re-applies persisted defaults on filter form reset", () => {
        const { $table } = mountTableShell();
        const opts = tableOptions({
            features: { filtering: true },
            columns: [
                column("company_id", {
                    hidden: true,
                    features: { filter: true },
                    filter: {
                        type: "hidden",
                        operator: "=",
                        default: "7",
                        persist: true,
                    },
                }),
            ],
        });
        opts.columns = opts.columns.map((c) => KGrid.normalizeColumnConfig(c));
        const $form = KGrid.setupFilterHeader($table, opts);
        const collection = {
            filtering: { handleSubmit: vi.fn() },
            url: { parameters: { filter: "company_id=7" } },
        };
        KGrid.setupDefaultFilters($form, opts, collection);

        const field = $form[0].elements.namedItem("company_id");
        field.value = "";
        $form.trigger("reset");
        expect(field.value).toBe("7");
        expect(collection.filtering.handleSubmit).toHaveBeenCalled();
    });

    it("FilterForm.ensure creates missing fields", () => {
        const form = document.createElement("form");
        document.body.appendChild(form);
        const api = new KGrid.FilterForm(form);
        api.ensure("company_id", "9", "=");
        expect(form.elements.namedItem("company_id").value).toBe("9");
    });
});
