import { describe, expect, it, vi } from "vitest";
import { column, mountTableShell, tableOptions } from "./helpers/fixtures.js";

describe("resolveRowActions", () => {
    it("shims features.delete and features.clone into menu items", () => {
        const ra = KGrid.resolveRowActions({
            features: { delete: true, clone: true, update: false },
        });
        expect(ra.display).toBe("buttons");
        expect(ra.menuItems.map((i) => i.action)).toEqual(["clone", "delete"]);
        expect(ra.editingItems).toEqual([]);
    });

    it("auto-adds save and cancel when features.update is true", () => {
        const ra = KGrid.resolveRowActions({
            features: { update: true },
            rowActions: { items: [{ action: "delete" }] },
        });
        expect(ra.editingItems.map((i) => i.action)).toEqual(["save", "cancel"]);
        expect(ra.menuItems.map((i) => i.action)).toEqual(["delete"]);
    });

    it("ignores features.delete/clone when rowActions is set", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const ra = KGrid.resolveRowActions({
            features: { delete: true, clone: true },
            rowActions: { items: [{ action: "delete" }] },
        });
        expect(ra.menuItems.map((i) => i.action)).toEqual(["delete"]);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });

    it("resolves custom callbacks from handlers", () => {
        const onOpen = vi.fn();
        const ra = KGrid.resolveRowActions(
            {
                rowActions: {
                    items: [{ id: "open", label: "Open", callback: "onOpen" }],
                },
            },
            { onOpen }
        );
        expect(ra.menuItems[0].callback).toBe(onOpen);
    });
});

describe("renderRowActions", () => {
    it("renders builtin buttons from rowActions", () => {
        const opts = tableOptions({
            features: { update: true },
            rowActions: { items: [{ action: "clone" }, { action: "delete" }] },
            columns: [column("name", { features: { update: true } })],
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
        const $actions = $table.find(".main-tbody td.kgrid-row-actions");
        expect($actions.find("button.clone-item").length).toBe(1);
        expect($actions.find("button.delete-item").length).toBe(1);
        expect($actions.find("button.save-item").length).toBe(1);
        expect($actions.find("button.cancel-edit").length).toBe(1);
        expect($actions.find(".kgrid-row-actions-menu").length).toBe(0);
    });

    it("renders dropdown for menu items and keeps save/cancel as buttons", () => {
        const opts = tableOptions({
            features: { update: true },
            rowActions: {
                display: "dropdown",
                items: [{ action: "clone" }, { action: "delete" }],
            },
            columns: [column("name", { features: { update: true } })],
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
        const $actions = $table.find(".main-tbody td.kgrid-row-actions");
        expect($actions.find(".kgrid-row-actions-menu").length).toBe(1);
        expect($actions.find(".dropdown-menu .clone-item").length).toBe(1);
        expect($actions.find(".dropdown-menu .delete-item").length).toBe(1);
        expect($actions.find("button.save-item").length).toBe(1);
        expect($actions.find("button.cancel-edit").length).toBe(1);
        expect($actions.find(".edit-item-grp button.clone-item").length).toBe(0);
        const $toggle = $actions.find(".kgrid-actions-dropdown-toggle");
        expect($toggle.length).toBe(1);
        expect($toggle.attr("data-bs-toggle")).toBeUndefined();
        expect($toggle.attr("data-bs-popper-config")).toBeUndefined();
    });

    it("renders custom action button with data-kgrid-action", () => {
        const opts = tableOptions({
            rowActions: {
                items: [
                    {
                        id: "open",
                        label: "Open",
                        icon: "fas fa-folder-open",
                        callback: () => {},
                    },
                ],
            },
            columns: [column("name")],
        });
        const { $table } = mountTableShell();
        KGrid.setupDataBody(
            $table.find(".main-tbody"),
            opts,
            $table.find(".thead-labels tr"),
            null,
            null,
            $table.find(".no-data-tbody")
        );
        expect(
            $table.find('.main-tbody td.kgrid-row-actions [data-kgrid-action="open"]').length
        ).toBe(1);
    });
});
