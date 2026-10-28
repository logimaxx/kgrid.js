import { describe, expect, it } from "vitest";
import { column, mountTableShell, tableOptions } from "./helpers/fixtures.js";

function mountDateRange(filter = {}, { normalize = false } = {}) {
    const { $table } = mountTableShell();
    let col = column("posted_at", {
        features: { filter: true },
        filter: { type: "date_range", ...filter },
    });
    if (normalize) {
        col = KGrid.normalizeColumnConfig(col);
    }
    const columns = [col];
    const $form = KGrid.setupFilterHeader(
        $table,
        tableOptions({
            features: { filtering: true },
            columns,
        })
    );
    $form.on("submit", (e) => e.preventDefault());
    return { $table, $form, form: $form[0], columns };
}

function setDates($table, from, to) {
    const $from = $table.find(".kgrid-date-range-from");
    const $to = $table.find(".kgrid-date-range-to");
    if (from != null) {
        $from.val(from);
    }
    if (to != null) {
        $to.val(to);
    }
    (from != null ? $from : $to).trigger("change");
}

function filterExpression(form) {
    const collection = { url: { parameters: {} }, offset: 4 };
    KGrid.syncFormFiltersToCollectionUrl(form, collection);
    return collection.url.parameters.filter;
}

describe("date_range field type", () => {
    it("rejects insert and update", () => {
        expect(() =>
            KGrid.createFieldInput({
                mode: "insert",
                col: column("posted_at"),
                config: { type: "date_range" },
            })
        ).toThrow(/only valid as a filter/);
    });

    it("builds from/to inputs and two hidden bounds", () => {
        const { $table, $form } = mountDateRange({
            fromLabel: "De la",
            toLabel: "Până la",
            operator: "~=~",
        });

        expect($table.find(".kgrid-date-range").length).toBe(1);
        expect($table.find(".kgrid-date-range-from").attr("name")).toBeUndefined();
        expect($table.find(".kgrid-date-range-to").attr("name")).toBeUndefined();
        expect($table.find(".kgrid-date-range-label").eq(0).text()).toBe("De la");
        expect($table.find(".kgrid-date-range-label").eq(1).text()).toBe("Până la");

        const $bounds = $form.find("input.kgrid-date-range-value");
        expect($bounds.length).toBe(2);
        expect($bounds.eq(0).attr("name")).toBe("posted_at");
        expect($bounds.eq(0).attr("data-operator")).toBe(">=");
        expect($bounds.eq(0).attr("data-kgrid-date-bound")).toBe("from");
        expect($bounds.eq(1).attr("name")).toBe("posted_at");
        expect($bounds.eq(1).attr("data-operator")).toBe("<=");
        expect($bounds.eq(1).attr("data-kgrid-date-bound")).toBe("to");
        expect($bounds.eq(0).attr("form")).toBe($form.attr("id"));
    });

    it("keeps >= and <= after column normalization", () => {
        const { $form } = mountDateRange({}, { normalize: true });
        const $bounds = $form.find("input.kgrid-date-range-value");
        expect($bounds.eq(0).attr("data-operator")).toBe(">=");
        expect($bounds.eq(1).attr("data-operator")).toBe("<=");
    });

    it("serializes both ends, one end, or nothing", () => {
        const { $table, form } = mountDateRange();

        setDates($table, "2026-01-01", "2026-01-31");
        expect(filterExpression(form)).toBe(
            "posted_at>=2026-01-01,posted_at<=2026-01-31 23:59:59"
        );
        expect($table.find(".kgrid-date-range-from").val()).toBe("2026-01-01");
        expect($table.find(".kgrid-date-range-to").val()).toBe("2026-01-31");

        setDates($table, "2026-03-01", "");
        expect(filterExpression(form)).toBe("posted_at>=2026-03-01");

        setDates($table, "", "2026-03-15");
        expect(filterExpression(form)).toBe("posted_at<=2026-03-15 23:59:59");

        setDates($table, "", "");
        expect(filterExpression(form)).toBeUndefined();
    });

    it("aligns an end date that is before the start", () => {
        const { $table, form } = mountDateRange();
        setDates($table, "2026-05-10", "2026-05-01");
        expect($table.find(".kgrid-date-range-to").val()).toBe("2026-05-10");
        expect(filterExpression(form)).toBe(
            "posted_at>=2026-05-10,posted_at<=2026-05-10 23:59:59"
        );
    });

    it("submits on change without waiting for the global debounce", () => {
        const { $table, $form } = mountDateRange({}, { normalize: true });
        const submits = [];
        $form.on("submit", (e) => {
            e.preventDefault();
            submits.push(1);
        });
        $table.find(".kgrid-date-range-from").val("2026-01-02").trigger("change");
        expect(submits).toEqual([1]);
    });

    it("applies { from, to } defaults and restores them on reset", async () => {
        const { $table, $form, form } = mountDateRange({
            default: { from: "2026-01-01", to: "2026-01-31" },
        });

        expect($table.find(".kgrid-date-range-from").val()).toBe("2026-01-01");
        expect($table.find(".kgrid-date-range-to").val()).toBe("2026-01-31");
        expect(filterExpression(form)).toBe(
            "posted_at>=2026-01-01,posted_at<=2026-01-31 23:59:59"
        );

        setDates($table, "2026-06-01", "2026-06-02");
        form.reset();
        await new Promise((resolve) => setTimeout(resolve, 0));
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect($table.find(".kgrid-date-range-from").val()).toBe("2026-01-01");
        expect($table.find(".kgrid-date-range-to").val()).toBe("2026-01-31");
        expect($form.find("[data-kgrid-date-bound='to']").val()).toBe("2026-01-31 23:59:59");
    });

    it("refills empty bounds from the default without replacing a value already set", () => {
        const { $table, $form, form, columns } = mountDateRange({
            default: { from: "2026-01-01", to: "2026-01-31" },
        });
        setDates($table, "2026-04-04", "");
        $form.find("[data-kgrid-date-bound='to']").val("");

        KGrid.applyColumnDefaultFilters(form, columns);

        expect($table.find(".kgrid-date-range-from").val()).toBe("2026-04-04");
        expect($table.find(".kgrid-date-range-to").val()).toBe("2026-01-31");
        expect($form.find("[data-kgrid-date-bound='from']").val()).not.toBe("[object Object]");
    });

    it("saves and restores each bound", () => {
        const { $table, form, columns } = mountDateRange();
        setDates($table, "2026-02-01", "2026-02-28");

        const saved = KGrid.readUserFilters(form, columns);
        expect(saved).toEqual([
            { name: "posted_at", value: "2026-02-01", operator: ">=" },
            { name: "posted_at", value: "2026-02-28 23:59:59", operator: "<=" },
        ]);

        setDates($table, "", "");
        KGrid.applyUserFilters(form, columns, { filters: saved });

        expect($table.find(".kgrid-date-range-from").val()).toBe("2026-02-01");
        expect($table.find(".kgrid-date-range-to").val()).toBe("2026-02-28");
        expect(filterExpression(form)).toBe(
            "posted_at>=2026-02-01,posted_at<=2026-02-28 23:59:59"
        );
    });

    it("copies both URL bounds and does not overwrite a bound already set", () => {
        const { $table, form } = mountDateRange();
        const collection = {
            url: {
                parameters: {
                    filter: "posted_at>=2026-03-01,posted_at<=2026-03-15 23:59:59",
                },
            },
        };

        KGrid.ensureUrlFiltersOnForm(form, collection);
        expect($table.find(".kgrid-date-range-from").val()).toBe("2026-03-01");
        expect($table.find(".kgrid-date-range-to").val()).toBe("2026-03-15");

        setDates($table, "2026-04-01", "");
        collection.url.parameters.filter =
            "posted_at>=2026-01-01,posted_at<=2026-01-31 23:59:59";
        KGrid.ensureUrlFiltersOnForm(form, collection);

        expect($table.find(".kgrid-date-range-from").val()).toBe("2026-04-01");
        expect($table.find(".kgrid-date-range-to").val()).toBe("2026-01-31");
    });
});
