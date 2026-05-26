import { describe, expect, it } from "vitest";

describe("select2 helpers", () => {
    it("select2OptionsWithDefault uses selected option", () => {
        const $select = $(`
<select>
  <option value="a">Alpha</option>
  <option value="b" selected>Beta</option>
</select>`);
        const opts = KGrid.select2OptionsWithDefault($select, { url: "/api" });
        expect(opts.url).toBe("/api");
        expect(opts.default).toEqual({ value: "b", label: "Beta" });
    });

    it("select2OptionsWithDefault uses object default spec", () => {
        const $select = $("<select></select>");
        const opts = KGrid.select2OptionsWithDefault($select, {}, { value: "x", label: "X" });
        expect(opts.default).toEqual({ value: "x", label: "X" });
    });

    it("assertSelect2Options throws when config incomplete", () => {
        expect(() => KGrid.assertSelect2Options({}, "test")).toThrow(/Invalid select2/);
    });

    it("assertSelect2Options passes with url, idFld, labelFld", () => {
        expect(() =>
            KGrid.assertSelect2Options({
                url: "/u",
                idFld: "id",
                labelFld: "name",
            }, "test")
        ).not.toThrow();
    });
});
