import { describe, expect, it } from "vitest";
import { column, mountTableShell, tableOptions } from "./helpers/fixtures.js";

function selectionTable() {
    document.body.innerHTML = `
      <table>
        <thead class="thead-labels"><tr>
          <th class="kgrid-select"><input type="checkbox" class="kgrid-select-all"></th>
        </tr></thead>
        <tbody class="main-tbody">
          <tr id="r1"><td><div class="cell-content"><input type="checkbox" class="kgrid-select-row"></div></td></tr>
          <tr id="r2"><td><div class="cell-content"><input type="checkbox" class="kgrid-select-row"></div></td></tr>
        </tbody>
      </table>`;
    $("#r1").data("instance", { id: "1", attributes: { id: "1", state: "CONFIRMED" } });
    $("#r2").data("instance", { id: "2", attributes: { id: "2", state: "IN_PRODUCTION" } });
    return {
        $table: $("table"),
        options: {
            features: { selection: true },
            selectedRows: new Map(),
            selection: {
                meta: function (item) {
                    return { state: item.attributes.state };
                },
            },
        },
    };
}

describe("selection", () => {
    it("installs a leading checkbox column", () => {
        const options = tableOptions({ features: { selection: true } });
        KGrid.installSelectionColumn(options);
        expect(options.columns[0].selection).toBe(true);
        expect(options.columns[0].name).toBe(KGrid.SELECTION_COLUMN_NAME);
        expect(options.columns[1].name).toBe("id");
    });

    it("renders a header checkbox that toggles the page", () => {
        const { $table } = mountTableShell();
        const options = tableOptions({
            features: { selection: true },
            selectionAllLabel: "Toggle all",
            columns: [
                column("name", { label: "Name" }),
            ],
        });
        KGrid.installSelectionColumn(options);
        options.columns = options.columns.map((col) => KGrid.normalizeColumnConfig(col));
        const labelsRow = KGrid.setupLabelsHeader($table.find(".thead-labels"), options);
        const $all = labelsRow.find("input.kgrid-select-all");
        expect($all.length).toBe(1);
        expect($all.attr("aria-label")).toBe("Toggle all");
        expect(labelsRow.find("th").first().hasClass("kgrid-select")).toBe(true);
    });

    it("toggle all selects the visible rows and a second toggle clears only those", () => {
        const { $table, options } = selectionTable();
        options.selectedRows.set("99", { id: "99" });

        KGrid.toggleSelection(options, $table);
        expect($("#r1 .kgrid-select-row").prop("checked")).toBe(true);
        expect($("#r2 .kgrid-select-row").prop("checked")).toBe(true);
        expect($table.find(".kgrid-select-all").prop("checked")).toBe(true);
        expect(options.selectedRows.get("1")).toEqual({ id: "1", state: "CONFIRMED" });
        expect(options.selectedRows.get("2").state).toBe("IN_PRODUCTION");
        expect(options.selectedRows.has("99")).toBe(true);

        KGrid.toggleSelection(options, $table);
        expect($("#r1 .kgrid-select-row").prop("checked")).toBe(false);
        expect($("#r2 .kgrid-select-row").prop("checked")).toBe(false);
        expect($table.find(".kgrid-select-all").prop("checked")).toBe(false);
        expect(options.selectedRows.has("1")).toBe(false);
        expect(options.selectedRows.has("99")).toBe(true);
    });

    it("keeps the selection column out of the chooser and pinned first", () => {
        const select = column(KGrid.SELECTION_COLUMN_NAME, { selection: true, label: "" });
        const name = column("name", { label: "Name" });
        const sku = column("sku", { label: "SKU" });
        expect(KGrid.chooserColumns([select, name, sku]).map((col) => col.name)).toEqual(["name", "sku"]);
        const ordered = KGrid.reorderColumns([select, name, sku], ["sku", "name"]);
        expect(ordered.map((col) => col.name)).toEqual([KGrid.SELECTION_COLUMN_NAME, "sku", "name"]);
    });
});
