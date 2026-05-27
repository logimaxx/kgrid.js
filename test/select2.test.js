import { describe, expect, it, vi } from "vitest";

describe("select2 widget", () => {
    it("select2OptionsWithDefault uses selected option", () => {
        const $select = $("<select><option value='a'>A</option></select>");
        $select.find("option").prop("selected", true);
        const opts = KGrid.select2.helpers.select2OptionsWithDefault($select, { url: "/api" });
        expect(opts.default).toEqual({ value: "a", label: "A" });
        expect(opts.url).toBe("/api");
    });

    it("assertSelect2Options throws when config incomplete", () => {
        expect(() => KGrid.select2.helpers.assertSelect2Options({}, "test")).toThrow(/Invalid select2/);
    });

    it("mount calls the host wrapper", () => {
        const wrapper = vi.fn();
        KGrid.configure({
            customInputTypes: {
                select2: KGrid.select2(wrapper),
                autosuggest: null,
            },
        });
        const $input = $("<select>");
        KGrid.getFieldType("select2").mount({
            mode: "insert",
            $input,
            config: {
                type: "select2",
                options: { url: "/x", idFld: "id", labelFld: "name" },
            },
            col: {},
        });
        expect(wrapper).toHaveBeenCalled();
    });
});
