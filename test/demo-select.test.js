import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadDemoSelectPlugin() {
    const body = fs.readFileSync(
        path.join(root, "integrations/kgrid-plugin-demo-select.js"),
        "utf8"
    );
    vm.runInNewContext(body, {
        window: globalThis,
        $: globalThis.$,
        jQuery: globalThis.jQuery,
        console,
        Object,
        Array,
        Error,
        TypeError,
    });
}

describe("demo_select plugin", () => {
    it("builds a select with options", () => {
        loadDemoSelectPlugin();
        const plugin = KGrid.demoSelect();
        const result = plugin.create({
            mode: "filter",
            config: {
                type: "demo_select",
                options: [
                    { label: "A", value: "a" },
                    { label: "B", value: "b" },
                ],
            },
        });
        expect(result.$input.prop("tagName")).toBe("SELECT");
        expect(result.$input.find("option").length).toBe(2);
    });

    it("registers via customInputTypes", () => {
        loadDemoSelectPlugin();
        KGrid.configure({
            customInputTypes: { demo_select: KGrid.demoSelect() },
        });
        expect(KGrid.getFieldType("demo_select")).toBeTruthy();
    });
});
