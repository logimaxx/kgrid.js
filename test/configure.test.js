import { describe, expect, it, vi } from "vitest";

describe("KGrid.configure", () => {
    it("routes log and onError to host handlers", () => {
        const log = vi.fn();
        const onError = vi.fn();
        KGrid.configure({ log, onError });

        KGrid.log("hello");
        KGrid.onError(new Error("boom"));

        expect(log).toHaveBeenCalledWith("hello");
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it("serializeForm collects named fields", () => {
        document.body.innerHTML = `
<form id="f">
  <input name="a" value="1" />
  <input name="b" value="2" />
</form>`;
        const form = document.getElementById("f");
        const data = KGrid.serializeForm(form);
        expect(data).toEqual({ a: "1", b: "2" });
    });

    it("confirm invokes onConfirm when host approves", () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        KGrid.configure({
            confirm(_msg, ok, cancel) {
                ok();
                cancel?.();
            },
        });

        KGrid.confirm("Delete?", onConfirm, onCancel);
        expect(onConfirm).toHaveBeenCalledOnce();
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it("runDeleteConfirm delegates to configure deleteConfirm", () => {
        const deleteConfirm = vi.fn((_ctx, ok) => ok());
        const onConfirm = vi.fn();
        KGrid.configure({ deleteConfirm });

        KGrid.runDeleteConfirm(
            { item: { id: "1" }, view: {}, options: {} },
            onConfirm
        );

        expect(deleteConfirm).toHaveBeenCalledOnce();
        expect(onConfirm).toHaveBeenCalledOnce();
    });

    it("runDeleteConfirm prefers options.deleteConfirm over configure", () => {
        const globalDeleteConfirm = vi.fn();
        const tableDeleteConfirm = vi.fn((_ctx, ok) => ok());
        KGrid.configure({ deleteConfirm: globalDeleteConfirm });

        KGrid.runDeleteConfirm(
            {
                item: {},
                view: {},
                options: { deleteConfirm: tableDeleteConfirm },
            },
            vi.fn()
        );

        expect(tableDeleteConfirm).toHaveBeenCalledOnce();
        expect(globalDeleteConfirm).not.toHaveBeenCalled();
    });

    it("runDeleteConfirm falls back to confirm with default message", () => {
        const confirm = vi.fn((_msg, ok) => ok());
        KGrid.configure({ deleteConfirm: null, confirm });

        KGrid.runDeleteConfirm({ item: {}, view: {}, options: {} }, vi.fn());

        expect(confirm).toHaveBeenCalledOnce();
        expect(confirm.mock.calls[0][0]).toBe(KGrid.DEFAULT_DELETE_CONFIRM_MESSAGE);
        expect(typeof confirm.mock.calls[0][1]).toBe("function");
    });

    it("wrapSelect2 requires configure select2", () => {
        KGrid.configure({ select2: null, autosuggest: vi.fn() });
        const $input = $("<select>");
        expect(() => KGrid.wrapSelect2($input, {})).toThrow(
            /configure\(\{ select2/
        );
    });

    it("autosuggest requires configure autosuggest", () => {
        KGrid.configure({ select2: vi.fn(), autosuggest: null });
        const $input = $("<input>");
        expect(() => KGrid.autosuggest($input, {})).toThrow(
            /configure\(\{ autosuggest/
        );
    });

    it("wrapSelect2 delegates to configured handler", () => {
        const select2 = vi.fn();
        KGrid.configure({ select2 });
        const $input = $("<select>");
        KGrid.wrapSelect2($input, { url: "/x" });
        expect(select2).toHaveBeenCalledWith($input, { url: "/x" });
    });

    it("getKViews prefers configure({ kviews }) over window", () => {
        const configured = { createCollectionInstance: vi.fn() };
        const globalStub = { createCollectionInstance: vi.fn() };
        globalThis.KViews = globalStub;
        KGrid.configure({ kviews: configured });

        expect(KGrid.getKViews()).toBe(configured);
        expect(KGrid.getKViews()).not.toBe(globalStub);
    });

    it("getKViews falls back to window.KViews", () => {
        const globalStub = { createCollectionInstance: vi.fn() };
        KGrid.configure({ kviews: null });
        globalThis.KViews = globalStub;

        expect(KGrid.getKViews()).toBe(globalStub);
    });

    it("getKViews returns null when nothing is available", () => {
        KGrid.configure({ kviews: null });
        delete globalThis.KViews;
        expect(KGrid.getKViews()).toBeNull();
    });
});
