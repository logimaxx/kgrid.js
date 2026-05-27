import { describe, expect, it } from "vitest";

describe("resolveFilterEvents", () => {
    it("defaults to change for select and input for text", () => {
        expect(
            KGrid.resolveFilterEvents({
                plugin: null,
                $input: $("<select>"),
            })
        ).toBe("change");
        expect(
            KGrid.resolveFilterEvents({
                plugin: null,
                $input: $("<input type='text'>"),
            })
        ).toBe("input");
    });

    it("uses plugin.filterEvents", () => {
        expect(
            KGrid.resolveFilterEvents({
                plugin: { filterEvents: "keyup" },
                $input: $("<input>"),
            })
        ).toBe("keyup");
    });

    it("create() filterEvents overrides plugin", () => {
        expect(
            KGrid.resolveFilterEvents({
                plugin: { filterEvents: "change" },
                $input: $("<input>"),
                createResult: { filterEvents: "input" },
            })
        ).toBe("input");
    });

    it("filterEvents false disables default binding", () => {
        expect(
            KGrid.resolveFilterEvents({
                plugin: { filterEvents: false },
                $input: $("<select>"),
            })
        ).toBeNull();
    });
});
