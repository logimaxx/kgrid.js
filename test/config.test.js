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
        });
    });

    it("lists valid input and filter types", () => {
        expect(KGrid.VALID_INPUT_TYPES).toContain("text");
        expect(KGrid.VALID_FILTER_TYPES).toContain("date");
        expect(KGrid.isPluggableFieldType("select2")).toBe(true);
        expect(KGrid.isPluggableFieldType("autosuggest")).toBe(true);
    });
});
