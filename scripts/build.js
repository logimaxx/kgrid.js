#!/usr/bin/env node
/**
 * Concatenate src/*.js into dist/kgrid.js and dist/kgrid.min.js (IIFE modules share window.KGrid).
 */
const fs = require("fs");
const path = require("path");
const { minify } = require("terser");

const root = path.join(__dirname, "..");
const srcDir = path.join(root, "src");
const outFile = path.join(root, "dist", "kgrid.js");
const minFile = path.join(root, "dist", "kgrid.min.js");

const order = [
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

const banner =
    "/*! @logimaxx/kgrid | (c) Logimaxx System SRL — proprietary | https://logimaxx.ro | built " +
    new Date().toISOString() +
    " */\n";

let body = banner;
for (const name of order) {
    const file = path.join(srcDir, name);
    if (!fs.existsSync(file)) {
        console.error("Missing:", file);
        process.exit(1);
    }
    body += `\n/* --- ${name} --- */\n`;
    body += fs.readFileSync(file, "utf8");
    body += "\n";
}

async function build() {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, body);
    console.log("Wrote", outFile, "(" + body.length + " bytes)");

    const minResult = await minify(body, {
        format: {
            comments: /^!/,
        },
    });
    if (!minResult.code) {
        throw new Error("Terser produced empty output");
    }
    fs.writeFileSync(minFile, minResult.code);
    console.log("Wrote", minFile, "(" + minResult.code.length + " bytes)");
}

build().catch(function (err) {
    console.error(err);
    process.exit(1);
});
