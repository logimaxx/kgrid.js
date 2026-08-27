import { describe, expect, it } from "vitest";

describe("dom helpers", () => {
    it("uuid returns unique non-empty strings", () => {
        const a = KGrid.uuid();
        const b = KGrid.uuid();
        expect(a).toBeTruthy();
        expect(b).toBeTruthy();
        expect(a).not.toBe(b);
    });

    it("anchorRowForm prepends hidden form into first td", () => {
        const $row = $("<tr><td>A</td><td>B</td></tr>");
        const $form = $("<form id='row-form'>");
        KGrid.anchorRowForm($form, $row);

        expect($form.attr("hidden")).toBe("hidden");
        expect($row.children("td").first().find("form#row-form").length).toBe(1);
    });

    it("filterFormField finds controls associated via form attribute", () => {
        document.body.innerHTML = `
<form id="filter-form" hidden></form>
<table><tr><th>
  <input form="filter-form" name="q" value="hello" />
</th></tr></table>`;
        const form = document.getElementById("filter-form");
        const $field = KGrid.filterFormField(form, "q");
        expect($field.val()).toBe("hello");
    });

    it("resolveHostElement accepts jQuery and DOM Element", () => {
        const el = document.createElement("div");
        el.id = "host-el";
        document.body.appendChild(el);

        expect(KGrid.resolveHostElement($(el))[0]).toBe(el);
        expect(KGrid.resolveHostElement(el)[0]).toBe(el);
        expect(() => KGrid.resolveHostElement(null)).toThrow(/required/);
        expect(() => KGrid.resolveHostElement({})).toThrow(/DOM Element or jQuery/);
    });

    it("filterFormField returns empty jQuery for unknown name", () => {
        const form = document.createElement("form");
        form.id = "empty-filter";
        document.body.appendChild(form);
        expect(KGrid.filterFormField(form, "missing").length).toBe(0);
    });

    it("hasActionColumn is true when delete, update, create, or clone is enabled", () => {
        expect(
            KGrid.hasActionColumn({ features: { delete: true } })
        ).toBe(true);
        expect(
            KGrid.hasActionColumn({ features: { update: true } })
        ).toBe(true);
        expect(
            KGrid.hasActionColumn({ features: { create: true } })
        ).toBe(true);
        expect(
            KGrid.hasActionColumn({ features: { clone: true } })
        ).toBe(true);
        expect(
            KGrid.hasActionColumn({
                features: { delete: false, update: false, create: false, clone: false },
            })
        ).toBe(false);
    });

});
