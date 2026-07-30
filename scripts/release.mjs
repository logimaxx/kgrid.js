#!/usr/bin/env node
/**
 * Release prep: run tests, build bundles, remind about committing dist/
 * when the repo tracks those paths. Uses Node only (no bash) for portability.
 *
 * KGrid is private — distribution is via GitHub (tag / branch), not npm publish.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** @param {string[]} args npm CLI args after `npm` */
function runNpm(args) {
    const cmd = process.platform === "win32" ? "npm.cmd" : "npm";
    const result = spawnSync(cmd, args, {
        cwd: root,
        stdio: "inherit",
        shell: false,
        env: process.env,
    });
    if (result.error) {
        console.error(result.error.message);
        process.exit(1);
    }
    const status = result.status ?? 1;
    if (status !== 0) process.exit(status);
}

function gitAvailable() {
    const r = spawnSync("git", ["rev-parse", "--git-dir"], {
        cwd: root,
        stdio: "ignore",
        shell: false,
    });
    return r.status === 0;
}

function porcelainDistDirs() {
    const r = spawnSync("git", ["status", "--porcelain", "--", "dist"], {
        cwd: root,
        encoding: "utf8",
        shell: false,
    });
    if (r.status !== 0 || typeof r.stdout !== "string") return "";
    return r.stdout.trimEnd();
}

function packageVersion() {
    try {
        const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
        return pkg.version || "?";
    } catch {
        return "?";
    }
}

console.log(">>> kgrid — release prep (test + build)");
console.log("    current package.json version:", packageVersion());
console.log("");

runNpm(["test"]);
runNpm(["run", "build"]);

console.log("");
if (gitAvailable()) {
    const pending = porcelainDistDirs();
    if (pending) {
        console.log("Build output not yet committed:");
        console.log(pending);
        console.log("");
        console.log("Stage and commit before npm version (npm version requires a clean tree):");
        console.log('  git add dist && git commit -m "chore: refresh dist"');
    } else {
        console.log("dist/ matches the index (nothing new from this build).");
    }
}

console.log("");
console.log("Then bump version, tag, publish, and push:");
console.log("  npm version patch   # or minor | major");
console.log("  npm publish");
console.log("  git push && git push --tags");
console.log("");
console.log("Consumers:");
console.log("  npm install @logimaxx/kgrid");
console.log('  # MaxxOps (keeps node_modules/kgrid/): npm install kgrid@npm:@logimaxx/kgrid@^0.2.2');
console.log("");
console.log(
    "Shortcut after a clean tree (Unix): ./version.sh patch  — bumps version + pushes tags; then npm publish"
);
