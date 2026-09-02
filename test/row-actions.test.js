import { describe, expect, it } from "vitest";
import { column, mountTableShell, tableOptions } from "./helpers/fixtures.js";

function countHeaderActions($table) {
    return $table.find(".thead-labels th.kgrid-row-actions").length;
}

function countDataRowCells($table) {
    return $table.find(".main-tbody tr").first().children("td").length;
}

function countVisibleDataColumns(options) {
    return options.columns.filter((col) => !col.hidden).length;
}

describe("row actions column", () => {
    it("aligns header and data row for update-only", () => {
        const opts = tableOptions({
            features: { update: true, delete: false, create: false },
            columns: [
                column("name", { features: { update: true } }),
            ],
        });
        const { $table } = mountTableShell();

        KGrid.setupLabelsHeader($table.find(".thead-labels"), opts);
        KGrid.setupDataBody(
            $table.find(".main-tbody"),
            opts,
            $table.find(".thead-labels tr"),
            null,
            null,
            $table.find(".no-data-tbody")
        );

        const visible = countVisibleDataColumns(opts);
        expect($table.find(".thead-labels th").length).toBe(visible + 1);
        expect(countHeaderActions($table)).toBe(1);
        expect(countDataRowCells($table)).toBe(visible + 1);
        expect($table.find(".main-tbody td.kgrid-row-actions").length).toBe(1);
    });

    it("aligns header and data row for create-only", () => {
        const opts = tableOptions({
            features: { create: true, update: false, delete: false },
            columns: [column("name", { features: { create: true } })],
        });
        const { $table } = mountTableShell();

        KGrid.setupLabelsHeader($table.find(".thead-labels"), opts);
        KGrid.setupDataBody(
            $table.find(".main-tbody"),
            opts,
            $table.find(".thead-labels tr"),
            null,
            null,
            $table.find(".no-data-tbody")
        );

        expect($table.find(".thead-labels th").length).toBe(2);
        expect(countDataRowCells($table)).toBe(2);
        expect($table.find(".main-tbody td.kgrid-row-actions button").length).toBe(0);
    });

    it("aligns header and data row for clone-only", () => {
        const opts = tableOptions({
            features: { clone: true, update: false, delete: false, create: false },
            columns: [column("name")],
        });
        const { $table } = mountTableShell();

        KGrid.setupLabelsHeader($table.find(".thead-labels"), opts);
        KGrid.setupDataBody(
            $table.find(".main-tbody"),
            opts,
            $table.find(".thead-labels tr"),
            null,
            null,
            $table.find(".no-data-tbody")
        );

        const visible = countVisibleDataColumns(opts);
        expect($table.find(".thead-labels th").length).toBe(visible + 1);
        expect(countHeaderActions($table)).toBe(1);
        expect($table.find(".main-tbody td.kgrid-row-actions button.clone-item").length).toBe(1);
        expect($table.find(".main-tbody td.kgrid-row-actions button.delete-item").length).toBe(0);
    });

    it("syncActionColumnColgroup adds a collapsible col for row actions", () => {
        const { $table } = mountTableShell();
        KGrid.syncActionColumnColgroup($table, 2, true, {
            features: { delete: true },
        });

        const $cols = $table.find("colgroup.kgrid-colgroup col");
        expect($cols.length).toBe(3);
        expect($cols.last().hasClass("kgrid-row-actions-col")).toBe(true);
        expect($cols.last().css("width")).toBe("3.25rem");
    });

    it("filter row matches label column count when filtering is on", () => {
        const opts = tableOptions({
            features: { filtering: true, update: true, delete: false, create: false },
            columns: [
                column("name", {
                    features: { filter: true },
                    filter: { type: "text" },
                }),
            ],
        });
        const { $table } = mountTableShell();

        const labelsRow = KGrid.setupLabelsHeader($table.find(".thead-labels"), opts);
        KGrid.setupFilterHeader($table, opts);

        const labelCount = labelsRow.find("th").length;
        const filterCount = $table.find(".thead-filters th").length;
        expect(filterCount).toBe(labelCount);
        expect($table.find(".thead-filters th.kgrid-row-actions").length).toBe(1);
    });
});
