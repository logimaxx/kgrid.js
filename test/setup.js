import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import jquery from "jquery";
import { beforeEach } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcDir = path.join(root, "src");

const SRC_ORDER = [
    "configure.js",
    "constants.js",
    "config.js",
    "dom.js",
    "table-shell.js",
    "field-types.js",
    "select2.js",
    "field-types-builtins.js",
    "field-types-integrations.js",
    "interaction.js",
    "labels.js",
    "filters.js",
    "cells.js",
    "data-body.js",
    "insert-row.js",
    "events.js",
    "init.js",
];

function loadKGridSource() {
    let body = "";
    for (const name of SRC_ORDER) {
        body += fs.readFileSync(path.join(srcDir, name), "utf8") + "\n";
    }
    const context = {
        window: globalThis,
        document: globalThis.document,
        $: jquery,
        jQuery: jquery,
        console,
        Math,
        Object,
        Array,
        Map,
        Set,
        Error,
        TypeError,
        JSON,
        FormData,
    };
    globalThis.$ = globalThis.jQuery = jquery;
    context.window.$ = context.window.jQuery = jquery;
    context.window.KGrid = context.window.KGrid || {};
    vm.runInNewContext(body, context);
    return context.window.KGrid;
}

globalThis.$ = globalThis.jQuery = jquery;
globalThis.KGrid = loadKGridSource();

beforeEach(() => {
    KGrid.configure({
        log() {},
        onError(err) {
            throw err;
        },
        confirm(message, onConfirm, onCancel) {
            onConfirm();
        },
        serializeForm(form) {
            const fd = new FormData(form);
            const out = {};
            for (const [key, value] of fd.entries()) {
                if (Object.prototype.hasOwnProperty.call(out, key)) {
                    if (!Array.isArray(out[key])) {
                        out[key] = [out[key]];
                    }
                    out[key].push(value);
                } else {
                    out[key] = value;
                }
            }
            return out;
        },
        select2($input) {
            $input.data("select2-mock", true);
        },
        autosuggest($input) {
            $input.data("autosuggest-mock", true);
        },
        kviews: null,
    });
});
