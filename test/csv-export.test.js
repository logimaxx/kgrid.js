import { describe, expect, it, vi } from "vitest";
import { column, initKGrid, mockKViews, mountTableHost, tableOptions } from "./helpers/fixtures.js";

describe("csv export url", () => {
    it("asks dbAPI for every field and keeps include", () => {
        const url = KGrid.buildCsvExportUrl(
            "/companies/1/product_order_qty?include=order_id,order_id.customer_id&sort=-id&page[product_order_qty][limit]=10&page[product_order_qty][offset]=20&fields[product_order_qty]=id",
            { type: "product_order_qty", mode: "all", limit: 10000 }
        );
        const params = new URL(url, "http://kgrid.local").searchParams;
        expect(params.get("format")).toBe("csv");
        expect(params.get("includetablehead")).toBe("true");
        expect(params.get("include")).toBe("order_id,order_id.customer_id");
        expect(params.get("sort")).toBe("-id");
        expect(params.get("page[product_order_qty][limit]")).toBe("10000");
        expect(params.get("page[product_order_qty][offset]")).toBe("0");
        expect(params.get("fields[product_order_qty]")).toBeNull();
    });

    it("sends the visible fields and drops include", () => {
        const url = KGrid.buildCsvExportUrl(
            "/inventory_opening_balance/4/inventory_opening_balance_lines?include=product_id&filter=qty%3E0",
            {
                type: "inventory_opening_balance_lines",
                mode: "visible",
                fields: ["product_id", "qty"],
                limit: 10000,
            }
        );
        const params = new URL(url, "http://kgrid.local").searchParams;
        expect(params.get("fields[inventory_opening_balance_lines]")).toBe("product_id,qty");
        expect(params.get("include")).toBeNull();
        expect(params.get("filter")).toBe("qty>0");
        expect(params.get("format")).toBe("csv");
    });

    it("keeps an absolute collection URL", () => {
        const url = KGrid.buildCsvExportUrl("https://db.example/data/products?sort=name", {
            type: "products",
            mode: "all",
        });
        expect(url.startsWith("https://db.example/data/products?")).toBe(true);
        expect(new URL(url).searchParams.get("format")).toBe("csv");
    });

    it("prefixes the KViews base path", () => {
        expect(KGrid.resolveApiUrl("/companies/1/products?format=csv", { basePath: "/api/v1/data" })).toBe(
            "/api/v1/data/companies/1/products?format=csv"
        );
    });
});

describe("csv export fields", () => {
    it("skips hidden, selection, and export:false columns", () => {
        const columns = [
            column("order_id"),
            column("customer_name", { export: false }),
            column("qty", { userHidden: true }),
            column("__select", { selection: true }),
            column("product_id", { exportField: "product_name" }),
        ].map((col) => KGrid.normalizeColumnConfig(col));
        expect(KGrid.csvExportFields(columns)).toEqual(["order_id", "product_name"]);
    });
});

describe("csv export panel", () => {
    it("offers full and visible export from the column panel", async () => {
        const { $host } = mountTableHost();
        const { instance } = mockKViews();
        globalThis.KViews.basePath = "/api/v1/data";
        instance.url = {
            toString() {
                return "/companies/1/products?include=vat_id&page[products][offset]=5";
            },
        };
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            blob: () => Promise.resolve(new Blob(["sku\nA\n"])),
        });
        const realFetch = window.fetch;
        window.fetch = fetchMock;
        const createObjectURL = window.URL.createObjectURL;
        const revokeObjectURL = window.URL.revokeObjectURL;
        const created = vi.fn(() => "blob:csv");
        window.URL.createObjectURL = created;
        window.URL.revokeObjectURL = () => {};
        try {
            await initKGrid(
                $host,
                tableOptions({
                    url: "/companies/1/products",
                    type: "products",
                    csvFileName: "produse.csv",
                    features: { columnChooser: true, csvExport: true },
                    columns: [
                        column("sku", { label: "SKU" }),
                        column("note", { label: "Note", export: false }),
                    ],
                })
            );
            const $panel = $host.find(".kgrid-column-chooser-panel");
            expect($panel.find(".kgrid-csv-export-visible").text()).toBe("Export CSV — visible fields");
            expect($panel.find(".kgrid-csv-export-all").length).toBe(1);
            $panel.find(".kgrid-csv-export-visible").trigger("click");
            await vi.waitFor(() => expect(created).toHaveBeenCalled());
            const requested = fetchMock.mock.calls[0][0];
            expect(requested.startsWith("/api/v1/data/companies/1/products?")).toBe(true);
            const params = new URL(requested, "http://kgrid.local").searchParams;
            expect(params.get("fields[products]")).toBe("sku");
            expect(params.get("include")).toBeNull();
            expect(params.get("page[products][offset]")).toBe("0");
        } finally {
            window.fetch = realFetch;
            window.URL.createObjectURL = createObjectURL;
            window.URL.revokeObjectURL = revokeObjectURL;
        }
    });
});
