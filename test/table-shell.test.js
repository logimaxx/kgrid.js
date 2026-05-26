import { describe, expect, it } from "vitest";
import { initKGrid, mockKViews, mountTableHost, tableOptions } from "./helpers/fixtures.js";

describe("table shell", () => {
    it("createTableShell builds expected structure", () => {
        const $table = KGrid.createTableShell(KGrid.protoOptions);
        expect($table.hasClass("custom-table")).toBe(true);
        expect($table.find(".thead-labels .sort").length).toBe(1);
        expect($table.find(".main-tbody").length).toBe(1);
        expect($table.find(".paging-footer").length).toBe(1);
    });

    it("renderTableShellHtml substitutes placeholders", () => {
        const html = KGrid.renderTableShellHtml({
            emptyRowMessage: "Nothing here",
            pagingPageSizes: [5, 15],
            pagingDefaultSize: 15,
            pagingFooterLabel: "rows per page. Total",
        });
        expect(html).toContain("Nothing here");
        expect(html).toContain('value="15" selected');
        expect(html).toContain("rows per page. Total");
        expect(html).not.toContain("{{EMPTY_ROW_MESSAGE}}");
    });

    it("mountTableShell appends table to empty host", () => {
        const { $host } = mountTableHost();
        expect($host.find("table").length).toBe(0);

        const $table = KGrid.mountTableShell($host, {
            pagingPageSizes: [5, 10],
            pagingDefaultSize: 5,
        });

        expect($table.length).toBe(1);
        expect($host.hasClass("custom-table-shell")).toBe(true);
        expect($host.find(".pagesize option").length).toBe(2);
    });

    it("init on empty host creates a working grid", async () => {
        const { host } = mountTableHost();
        mockKViews();

        const grid = await initKGrid(host, tableOptions());

        expect(grid.$host.find("table.custom-table").length).toBe(1);
        expect(grid.$host.find(".thead-labels th").length).toBeGreaterThan(0);
        expect(grid.instance).toBeTruthy();
    });
});
