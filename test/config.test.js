import { describe, expect, it } from "vitest";

describe("setDefaultValues", () => {
    it("merges column config with proto defaults", () => {
        const col = KGrid.setDefaultValues(KGrid.protoColumnConfig, {
            name: "title",
            label: "Title",
            features: { sort: true },
        });

        expect(col.name).toBe("title");
        expect(col.label).toBe("Title");
        expect(col.features.sort).toBe(true);
        expect(col.features.filter).toBe(false);
        expect(col.display.events).toEqual([]);
    });

    it("deep-merges nested objects", () => {
        const col = KGrid.setDefaultValues(KGrid.protoColumnConfig, {
            name: "x",
            filter: { type: "number", operator: "=" },
        });

        expect(col.filter.type).toBe("number");
        expect(col.filter.operator).toBe("=");
        expect(col.filter.placeholder).toBe("");
    });

    it("normalizeColumnConfig is used as the public column merge", () => {
        const col = KGrid.normalizeColumnConfig({
            name: "y",
            filter: { persist: true },
        });
        expect(col.filter.persist).toBe(true);
        expect(col.filter.type).toBe("text");
    });
});

describe("constants", () => {
    it("exposes protoOptions with feature flags off by default", () => {
        expect(KGrid.protoOptions.features).toEqual({
            filtering: false,
            sorting: false,
            paging: false,
            create: false,
            update: false,
            delete: false,
            clone: false,
            columnChooser: false,
        });
    });

    it("builds onduplicate query params with field operators", () => {
        expect(KGrid.onDuplicateParams("ignore")).toEqual({ onduplicate: "ignore" });
        expect(
            KGrid.onDuplicateParams({
                action: "update",
                fields: { qty: "add", notes: "set" },
            })
        ).toEqual({ onduplicate: "update", update: "qty:add,notes" });
        expect(KGrid.onDuplicateParams({ action: "update", fields: "qty:add,price:sub" })).toEqual({
            onduplicate: "update",
            update: "qty:add,price:sub",
        });
    });

    it("appends onduplicate to the insert URL and keeps existing params", () => {
        expect(
            KGrid.applyOnDuplicateToUrl("/lines?include=product_id", {
                action: "update",
                fields: { qty: "add" },
            })
        ).toBe("/lines?include=product_id&onduplicate=update&update=qty%3Aadd");
    });

    it("replaces a previous onduplicate pair on the insert URL", () => {
        expect(
            KGrid.applyOnDuplicateToUrl(
                "/lines?onduplicate=update&update=qty%3Aadd&include=product_id",
                "ignore"
            )
        ).toBe("/lines?include=product_id&onduplicate=ignore");
    });

    it("rejects an update without fields and an unknown operator", () => {
        expect(() => KGrid.onDuplicateParams({ action: "update" })).toThrow(/fields/);
        expect(() => KGrid.onDuplicateParams({ action: "update", fields: { qty: "mul" } })).toThrow(
            /operator/
        );
        expect(() => KGrid.onDuplicateParams("upsert")).toThrow(/action/);
    });

    it("lists valid input and filter types", () => {
        expect(KGrid.VALID_INPUT_TYPES).toContain("text");
        expect(KGrid.VALID_FILTER_TYPES).toContain("date");
        expect(KGrid.isPluggableFieldType("select2")).toBe(true);
        expect(KGrid.isPluggableFieldType("autosuggest")).toBe(true);
    });
});
