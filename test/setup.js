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
    "field-types-builtins.js",
    "interaction.js",
    "labels.js",
    "filters.js",
    "cells.js",
    "data-body.js",
    "insert-row.js",
    "events.js",
    "preferences.js",
    "column-chooser.js",
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
        localStorage: globalThis.localStorage,
        setTimeout: (...args) => globalThis.setTimeout(...args),
        clearTimeout: (id) => globalThis.clearTimeout(id),
    };
    globalThis.$ = globalThis.jQuery = jquery;
    context.window.$ = context.window.jQuery = jquery;
    context.window.KGrid = context.window.KGrid || {};
    vm.runInNewContext(body, context);
    return context.window.KGrid;
}

function loadWidgets() {
    const body = fs.readFileSync(path.join(root, "integrations/kgrid-widgets.js"), "utf8");
    vm.runInNewContext(body, {
        window: globalThis,
        document: globalThis.document,
        $: globalThis.$,
        jQuery: globalThis.jQuery,
        console,
        Math,
        Object,
        Array,
        Error,
        TypeError,
        JSON,
        setTimeout: (...args) => globalThis.setTimeout(...args),
        clearTimeout: (id) => globalThis.clearTimeout(id),
    });
}

globalThis.$ = globalThis.jQuery = jquery;
globalThis.KGrid = loadKGridSource();
loadWidgets();

beforeEach(() => {
    KGrid.configure({
        log() {},
        onError(err) {
            throw err;
        },
        confirm(message, onConfirm, onCancel) {
            onConfirm();
        },
        serializeForm: KGrid.serializeFormDefault,
        kviews: null,
        filterDebounceMs: 300,
        preferencesStorage: null,
        customInputTypes: {
            select2: KGrid.select2(function ($input) {
                $input.data("select2-mock", true);
            }),
            autosuggest: KGrid.autosuggest(function ($input) {
                $input.data("autosuggest-mock", true);
            }),
        },
    });
});
