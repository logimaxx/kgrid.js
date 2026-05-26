import { afterEach, describe, expect, it, vi } from "vitest";
import {
    column,
    initKGrid,
    mockKViews,
    mountTableHost,
    mountTableShell,
    tableOptions,
} from "./helpers/fixtures.js";

describe("KGrid.init", () => {
    afterEach(() => {
        delete globalThis.KViews;
        document.body.innerHTML = "";
    });

    it("throws when KViews is not loaded", async () => {
        const { $host } = mountTableHost();
        KGrid.configure({ kviews: null });
        delete globalThis.KViews;
        await expect(initKGrid($host, tableOptions())).rejects.toThrow(
            /@logimaxx\/kviews/
        );
    });

    it("accepts host as native DOM element", async () => {
        const { $host } = mountTableHost();
        const el = $host[0];
        mockKViews();

        const grid = await initKGrid(el, tableOptions());

        expect(grid.$host[0]).toBe(el);
        expect(grid.getInteraction()).toBe("view");
    });

    it("accepts kviews via init options without window.KViews", async () => {
        const { $host } = mountTableHost();
        KGrid.configure({ kviews: null });
        delete globalThis.KViews;
        const { instance } = mockKViews();
        const kviewsApi = globalThis.KViews;
        delete globalThis.KViews;

        const grid = await initKGrid($host, tableOptions({ kviews: kviewsApi }));

        expect(grid.instance).toBe(instance);
    });

    it("loads local data via KViews collection", async () => {
        const { $host } = mountTableHost();
        const { instance } = mockKViews();

        const grid = await initKGrid($host, tableOptions());

        expect(KViews.createCollectionInstance).toHaveBeenCalledOnce();
        expect(instance.loadFromData).toHaveBeenCalledWith([
            { attributes: { id: "1", name: "Alpha" } },
        ]);
        expect(grid.instance).toBe(instance);
        expect(grid.filterForm).toBeInstanceOf(KGrid.FilterForm);
    });

    it("loads remote url and wires delete/update/insert urls", async () => {
        const { $host } = mountTableHost();
        const { instance } = mockKViews();

        await initKGrid(
            $host,
            tableOptions({
                data: undefined,
                url: "/api/items",
                deleteUrl: "/api/items/delete",
                updateUrl: "/api/items/update",
                insertUrl: "/api/items/insert",
            })
        );

        expect(instance.setUrl).toHaveBeenCalledWith("/api/items");
        expect(instance.setUrl).toHaveBeenCalledWith("/api/items/delete", "delete");
        expect(instance.setUrl).toHaveBeenCalledWith("/api/items/update", "update");
        expect(instance.setUrl).toHaveBeenCalledWith("/api/items/insert", "insert");
        expect(instance.loadFromRemote).toHaveBeenCalledOnce();
    });

    it("exposes setInteraction and getInteraction on returned API", async () => {
        const { $host } = mountTableHost();
        mockKViews();

        const grid = await initKGrid($host, tableOptions({ defaultInteraction: "view" }));

        expect(grid.getInteraction()).toBe("view");
        grid.setInteraction("edit");
        expect(grid.getInteraction()).toBe("edit");
        expect($host.attr("data-interaction")).toBe("edit");
    });

    it("setEditMode maps boolean to interaction mode", async () => {
        const { $host } = mountTableHost();
        mockKViews();

        const grid = await initKGrid($host, tableOptions());
        grid.setEditMode(true);
        expect(grid.getInteraction()).toBe("edit");
        grid.setEditMode(false);
        expect(grid.getInteraction()).toBe("view");
    });

    it("toggleEditMode flips mode and ignores DOM event argument", async () => {
        const { $host } = mountTableHost();
        mockKViews();

        const grid = await initKGrid($host, tableOptions());
        expect(grid.getInteraction()).toBe("view");

        grid.toggleEditMode();
        expect(grid.getInteraction()).toBe("edit");

        grid.toggleEditMode({ preventDefault: function () {} });
        expect(grid.getInteraction()).toBe("view");

        grid.toggleEditMode(true);
        expect(grid.getInteraction()).toBe("edit");
    });

    it("resolves string event callbacks from handlers map", async () => {
        const { $host } = mountTableHost();
        mockKViews();
        const onClick = vi.fn();
        const opts = tableOptions({
            handlers: { onNameClick: onClick },
            columns: [
                column("name", {
                    display: {
                        template: "{{name}}",
                        events: [
                            {
                                selector: ".name-link",
                                event: "click",
                                callback: "onNameClick",
                            },
                        ],
                    },
                }),
            ],
        });

        await initKGrid($host, opts);

        expect(opts.columns[0].display.events[0].callback).toBe(onClick);
    });

    it("throws when event callback name is missing", async () => {
        const { $host } = mountTableHost();
        mockKViews();

        await expect(
            initKGrid(
                $host,
                tableOptions({
                    columns: [
                        column("name", {
                            display: {
                                template: "{{name}}",
                                events: [
                                    {
                                        selector: "a",
                                        event: "click",
                                        callback: "missingHandler",
                                    },
                                ],
                            },
                        }),
                    ],
                })
            )
        ).rejects.toThrow(/missingHandler/);
    });

    it("builds table when host is empty", async () => {
        const { host } = mountTableHost();
        mockKViews();

        await initKGrid(host, tableOptions());

        expect($("#kgrid-host table.custom-table").length).toBe(1);
        expect($("#kgrid-host").hasClass("custom-table-shell")).toBe(true);
    });

    it("removes paging footer when paging disabled", async () => {
        const { $host, $table } = mountTableShell();
        mockKViews();

        await initKGrid($host, tableOptions({ features: { paging: false } }));
        expect($table.find(".paging-footer").length).toBe(0);
    });

    it("creates filter form when filtering enabled", async () => {
        const { $host, $table } = mountTableShell();
        mockKViews();

        const grid = await initKGrid(
            $host,
            tableOptions({
                features: { filtering: true },
                columns: [
                    column("name", {
                        features: { filter: true },
                        filter: { type: "text" },
                    }),
                ],
            })
        );

        expect(grid.filterForm).toBeInstanceOf(KGrid.FilterForm);
        expect($table.find(".thead-filters input[name='name']").length).toBe(1);
    });
});
