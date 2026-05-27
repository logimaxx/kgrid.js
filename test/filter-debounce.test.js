import { describe, expect, it } from "vitest";

describe("filter debounce resolution", () => {
    it("uses column debounceMs over global", () => {
        KGrid.configure({ filterDebounceMs: 300 });
        expect(
            KGrid.resolveFilterDebounceMs({
                filterConfig: { debounceMs: 100 },
                plugin: null,
            })
        ).toBe(100);
    });

    it("uses plugin filterDebounceMs when column omits debounceMs", () => {
        KGrid.configure({ filterDebounceMs: 300 });
        expect(
            KGrid.resolveFilterDebounceMs({
                filterConfig: {},
                plugin: { filterDebounceMs: 50 },
            })
        ).toBe(50);
    });

    it("treats column debounceMs: null as unset (falls back to global)", () => {
        KGrid.configure({ filterDebounceMs: 300 });
        expect(
            KGrid.resolveFilterDebounceMs({
                filterConfig: { debounceMs: null },
                plugin: null,
            })
        ).toBe(300);
    });

    it("shouldDebounceFilterSubmit debounces change events", () => {
        expect(KGrid.shouldDebounceFilterSubmit("change", 300)).toBe(true);
        expect(KGrid.shouldDebounceFilterSubmit("input", 300)).toBe(true);
        expect(KGrid.shouldDebounceFilterSubmit("change", 0)).toBe(false);
        expect(KGrid.shouldDebounceFilterSubmit("input", 0)).toBe(false);
    });
});
