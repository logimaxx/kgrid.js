import { describe, expect, it } from "vitest";
import { column, mountTableShell, tableOptions } from "./helpers/fixtures.js";

describe("setupLabelsHeader", () => {
    it("renders label cells for visible columns", () => {
        const { $table } = mountTableShell();
        const labelsRow = KGrid.setupLabelsHeader(
            $table.find(".thead-labels"),
            tableOptions({
                columns: [
                    column("id", { label: "ID" }),
                    column("name", { label: "Name" }),
                ],
            })
        );

        expect(labelsRow.find("th").length).toBe(2);
        expect(labelsRow.find("th").eq(0).text()).toContain("ID");
        expect(labelsRow.find("th").eq(1).text()).toContain("Name");
    });

    it("adds sort link when column.features.sort is true", () => {
        const { $table } = mountTableShell();
        const labelsRow = KGrid.setupLabelsHeader(
            $table.find(".thead-labels"),
            tableOptions({
                features: { sorting: true },
                columns: [
                    column("name", {
                        label: "Name",
                        features: { sort: true },
                    }),
                ],
            })
        );

        const $sort = labelsRow.find("a.sort[data-sortfld='name']");
        expect($sort.length).toBe(1);
        expect($sort.find("span.column-label").text()).toBe("Name");
    });

    it("skips hidden columns", () => {
        const { $table } = mountTableShell();
        const labelsRow = KGrid.setupLabelsHeader(
            $table.find(".thead-labels"),
            tableOptions({
                columns: [
                    column("visible", { label: "Visible" }),
                    column("secret", { hidden: true, label: "Secret" }),
                ],
            })
        );
        expect(labelsRow.find("th").length).toBe(1);
    });
});
