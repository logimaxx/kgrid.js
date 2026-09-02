import { afterEach, describe, expect, it, vi } from "vitest";
import {
    column,
    initKGrid,
    mockKViews,
    mountTableHost,
    tableOptions,
} from "./helpers/fixtures.js";

function memoryStorage() {
    const map = new Map();
    return {
        get(key) {
            return map.has(key) ? map.get(key) : null;
        },
        set(key, value) {
            if (value == null) {
                map.delete(key);
            } else {
                map.set(key, value);
            }
        },
        map,
    };
}

describe("parseFilterExpression", () => {
    it("prefers ~=~ over =", () => {
        expect(KGrid.parseFilterExpression("name~=~foo")).toEqual({
            name: "name",
            operator: "~=~",
            value: "foo",
        });
    });

    it("parses equality", () => {
        expect(KGrid.parseFilterExpression("company_id=12")).toEqual({
            name: "company_id",
            operator: "=",
            value: "12",
        });
    });
});

describe("column layout merge", () => {
    it("reorders visible columns and keeps schema-hidden in place", () => {
        const cols = [
            column("id", { hidden: true }),
            column("sku"),
            column("name"),
            column("price"),
        ].map((c) => KGrid.normalizeColumnConfig(c));
        const merged = KGrid.mergeLayoutIntoColumns(cols, {
            v: 1,
            columns: [
                { name: "price", hidden: false },
                { name: "sku", hidden: true },
                { name: "name", hidden: false },
            ],
        });
        expect(merged.map((c) => c.name)).toEqual(["id", "price", "sku", "name"]);
        expect(merged.find((c) => c.name === "sku").userHidden).toBe(true);
        expect(merged.find((c) => c.name === "id").hidden).toBe(true);
    });

    it("does not hide locked columns", () => {
        const cols = [
            column("name", { locked: true }),
            column("sku"),
        ].map((c) => KGrid.normalizeColumnConfig(c));
        const merged = KGrid.mergeLayoutIntoColumns(cols, {
            v: 1,
            columns: [
                { name: "name", hidden: true },
                { name: "sku", hidden: false },
            ],
        });
        expect(merged.find((c) => c.name === "name").userHidden).toBe(false);
    });

    it("appends columns missing from saved layout", () => {
        const cols = [column("sku"), column("name"), column("active")].map((c) =>
            KGrid.normalizeColumnConfig(c)
        );
        const merged = KGrid.mergeLayoutIntoColumns(cols, {
            v: 1,
            columns: [{ name: "name", hidden: false }],
        });
        expect(merged.map((c) => c.name)).toEqual(["name", "sku", "active"]);
    });
});

describe("preferences persist", () => {
    afterEach(() => {
        delete globalThis.KViews;
        document.body.innerHTML = "";
    });

    it("restores layout before first paint", async () => {
        const storage = memoryStorage();
        storage.set("kgrid:demo:layout", {
            v: 1,
            columns: [
                { name: "name", hidden: false },
                { name: "id", hidden: true },
            ],
        });
        const { $host } = mountTableHost();
        mockKViews();
        const grid = await initKGrid(
            $host,
            tableOptions({
                storageKey: "demo",
                preferencesStorage: storage,
                columns: [column("id", { label: "ID" }), column("name", { label: "Name" })],
            })
        );
        const labels = $host.find(".thead-labels th").map(function () {
            return $(this).attr("data-name");
        }).get();
        expect(labels).toEqual(["name", "id"]);
        expect($host.find("th[data-name='id']").hasClass("kgrid-user-hidden")).toBe(true);
        expect(grid.getLayout().columns).toEqual([
            { name: "name", hidden: false },
            { name: "id", hidden: true },
        ]);
    });

    it("setLayout reorders DOM and saves", async () => {
        const storage = memoryStorage();
        const { $host } = mountTableHost();
        mockKViews();
        const grid = await initKGrid(
            $host,
            tableOptions({
                storageKey: "demo",
                preferencesStorage: storage,
                columns: [column("id"), column("name")],
            })
        );
        grid.setLayout({
            columns: [
                { name: "name", hidden: false },
                { name: "id", hidden: false },
            ],
        });
        const labels = $host.find(".thead-labels th").map(function () {
            return $(this).attr("data-name");
        }).get();
        expect(labels).toEqual(["name", "id"]);
        expect(storage.get("kgrid:demo:layout").columns[0].name).toBe("name");
    });

    it("resetLayout restores schema order and clears storage", async () => {
        const storage = memoryStorage();
        const { $host } = mountTableHost();
        mockKViews();
        const grid = await initKGrid(
            $host,
            tableOptions({
                storageKey: "demo",
                preferencesStorage: storage,
                columns: [column("id"), column("name")],
            })
        );
        grid.setLayout({
            columns: [
                { name: "name", hidden: false },
                { name: "id", hidden: true },
            ],
        });
        grid.resetLayout();
        const labels = $host.find(".thead-labels th").map(function () {
            return $(this).attr("data-name");
        }).get();
        expect(labels).toEqual(["id", "name"]);
        expect($host.find("th[data-name='id']").hasClass("kgrid-user-hidden")).toBe(false);
        expect(storage.get("kgrid:demo:layout")).toBeNull();
    });

    it("restores user filters onto the form before remote load", async () => {
        const storage = memoryStorage();
        storage.set("kgrid:demo:filters", {
            v: 1,
            filters: [{ name: "name", value: "Alpha", operator: "~=~" }],
        });
        const { $host } = mountTableHost();
        const { instance } = mockKViews();
        instance.url = { parameters: {} };
        instance.filtering = { handleSubmit: vi.fn() };

        await initKGrid(
            $host,
            tableOptions({
                data: undefined,
                url: "/api/items",
                storageKey: "demo",
                preferencesStorage: storage,
                features: { filtering: true },
                columns: [
                    column("name", {
                        features: { filter: true },
                        filter: { type: "text", operator: "~=~" },
                    }),
                ],
            })
        );

        expect($host.find("input[name='name']").val()).toBe("Alpha");
        expect(instance.loadFromRemote).toHaveBeenCalledOnce();
        expect(instance.url.parameters.filter).toContain("name");
    });

    it("scopes saved filters by filterStorageScope", async () => {
        const storage = memoryStorage();
        storage.set("kgrid:demo:filters:9", {
            v: 1,
            filters: [{ name: "name", value: "Scoped", operator: "~=~" }],
        });
        const { $host } = mountTableHost();
        mockKViews();
        await initKGrid(
            $host,
            tableOptions({
                storageKey: "demo",
                filterStorageScope: "9",
                preferencesStorage: storage,
                features: { filtering: true },
                columns: [
                    column("name", {
                        features: { filter: true },
                        filter: { type: "text", operator: "~=~" },
                    }),
                ],
            })
        );
        expect($host.find("input[name='name']").val()).toBe("Scoped");
    });

    it("saves user filters on form submit", async () => {
        const storage = memoryStorage();
        const { $host } = mountTableHost();
        mockKViews();
        const grid = await initKGrid(
            $host,
            tableOptions({
                storageKey: "demo",
                preferencesStorage: storage,
                features: { filtering: true },
                columns: [
                    column("name", {
                        features: { filter: true },
                        filter: { type: "text", operator: "~=~" },
                    }),
                ],
            })
        );
        $host.find("input[name='name']").val("Beta");
        $(grid.filterForm.form).triggerHandler("submit");
        expect(storage.get("kgrid:demo:filters")).toEqual({
            v: 1,
            filters: [{ name: "name", value: "Beta", operator: "~=~" }],
        });
    });

    it("keeps URL filters that are not on the form", async () => {
        const { $host } = mountTableHost();
        const { instance } = mockKViews();
        instance.url = { parameters: { filter: "company_id=42" } };
        instance.filtering = { handleSubmit: vi.fn() };
        await initKGrid(
            $host,
            tableOptions({
                data: undefined,
                url: "/api/items?filter=company_id=42",
                features: { filtering: true },
                columns: [
                    column("name", {
                        features: { filter: true },
                        filter: { type: "text", operator: "~=~" },
                    }),
                ],
            })
        );
        const field = gridFormField($host, "company_id");
        expect(field).toBeTruthy();
        expect(field.value).toBe("42");
    });
});

function gridFormField($host, name) {
    const form = $host.find("form.table-filter-form")[0];
    return form && form.elements.namedItem(name);
}

describe("column chooser UI", () => {
    afterEach(() => {
        delete globalThis.KViews;
        document.body.innerHTML = "";
    });

    it("renders a picker when columnChooser is enabled", async () => {
        const { $host } = mountTableHost();
        mockKViews();
        await initKGrid(
            $host,
            tableOptions({
                features: { columnChooser: true },
                columns: [
                    column("id", { hidden: true }),
                    column("name", { label: "Name", locked: true }),
                    column("sku", { label: "SKU" }),
                ],
            })
        );
        const $items = $host.find(".kgrid-column-chooser-list li");
        expect($host.find(".kgrid-column-chooser").length).toBe(1);
        expect($items.length).toBe(2);
        expect($items.eq(0).attr("data-name")).toBe("name");
        expect($items.eq(0).find("input").prop("disabled")).toBe(true);
        expect($items.filter("[data-name='id']").length).toBe(0);
    });
});
