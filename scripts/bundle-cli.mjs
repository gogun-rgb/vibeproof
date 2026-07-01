import { rm, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const outfile = path.join(root, "packages", "cli", "dist", "index.js");
const workspaceAliases = new Map(
  [
    "ai-providers",
    "core",
    "orchestrator",
    "report",
    "rules",
    "scanners",
    "verifier"
  ].map((name) => [`@vibeproof/${name}`, path.join(root, "packages", name, "src", "index.ts")])
);

await build({
  entryPoints: [path.join(root, "packages", "cli", "src", "index.ts")],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  plugins: [
    {
      name: "vibeproof-workspace-aliases",
      setup(buildContext) {
        buildContext.onResolve({ filter: /^@vibeproof\// }, (args) => {
          const aliasPath = workspaceAliases.get(args.path);
          return aliasPath ? { path: aliasPath } : undefined;
        });
      }
    }
  ]
});

await rm(`${outfile}.map`, { force: true });

const output = await readFile(outfile, "utf8");
if (!output.startsWith("#!/usr/bin/env node")) {
  throw new Error("Bundled CLI is missing the node shebang.");
}
