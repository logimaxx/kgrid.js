#!/usr/bin/env node
/**
 * Concatenate src/*.js into dist/kgrid.js (IIFE modules share window.KGrid).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const srcDir = path.join(root, "src");
const outFile = path.join(root, "dist", "kgrid.js");

const order = [
    "configure.js",
    "constants.js",
    "config.js",
    "dom.js",
    "select2.js",
    "interaction.js",
    "labels.js",
    "filters.js",
    "cells.js",
    "data-body.js",
    "insert-row.js",
    "events.js",
    "init.js",
];

const banner = `/*! kgrid | built ${new Date().toISOString()} */\n`;

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

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, body);
console.log("Wrote", outFile, "(" + body.length + " bytes)");
