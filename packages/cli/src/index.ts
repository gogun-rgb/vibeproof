#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { runScan } from "@vibeproof/orchestrator";
import { formatReport, type OutputFormat } from "@vibeproof/report";
import { getRule, scanRules } from "@vibeproof/rules";
import type { ScanReport, Verdict } from "@vibeproof/core";

interface CliIo {
  stdout: { write(message: string): void };
  stderr: { write(message: string): void };
}

interface ScanArgs {
  target: string;
  format: OutputFormat;
  explain: boolean;
  noAi: boolean;
  failOn?: "warn" | "block";
}

interface CliDeps {
  runScanImpl?: typeof runScan;
}

function usage(): string {
  return [
    "VibeProof",
    "",
    "Usage:",
    "  vibeproof scan <github-url-or-local-path> [--format terminal|json|markdown] [--explain] [--no-ai] [--fail-on warn|block]",
    "  vibeproof rules list",
    "  vibeproof explain <rule-id>",
    "",
    "Default scan mode is --no-ai. Static scoring is deterministic."
  ].join("\n");
}

function parseScanArgs(argv: string[]): ScanArgs {
  const target = argv[0];
  if (!target) {
    throw new Error("Missing scan target.");
  }
  const args: ScanArgs = {
    target,
    format: "terminal",
    explain: false,
    noAi: true
  };

  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--format") {
      const value = argv[++index] as OutputFormat | undefined;
      if (!value || !["terminal", "json", "markdown"].includes(value)) {
        throw new Error("--format must be terminal, json, or markdown.");
      }
      args.format = value;
    } else if (arg === "--explain") {
      args.explain = true;
      args.noAi = false;
    } else if (arg === "--no-ai") {
      args.noAi = true;
    } else if (arg === "--fail-on") {
      const value = argv[++index] as "warn" | "block" | undefined;
      if (!value || !["warn", "block"].includes(value)) {
        throw new Error("--fail-on must be warn or block.");
      }
      args.failOn = value;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return args;
}

function exitCodeForVerdict(verdict: Verdict, failOn?: "warn" | "block"): number {
  if (failOn === "block") {
    return verdict === "BLOCK" ? 2 : 0;
  }
  if (verdict === "ALLOW") {
    return 0;
  }
  return verdict === "WARN" ? 1 : 2;
}

export async function runCli(argv: string[], io: CliIo = process, deps: CliDeps = {}): Promise<number> {
  try {
    const [command, subcommand, ...rest] = argv;
    if (!command || command === "--help" || command === "-h") {
      io.stdout.write(`${usage()}\n`);
      return 0;
    }

    if (command === "scan") {
      const scanArgs = parseScanArgs([subcommand ?? "", ...rest]);
      const scan = deps.runScanImpl ?? runScan;
      const report: ScanReport = await scan(scanArgs.target, {
        explain: scanArgs.explain,
        noAi: scanArgs.noAi
      });
      io.stdout.write(formatReport(report, scanArgs.format));
      if (report.validationErrors.length > 0) {
        io.stderr.write(`Verifier failed: ${report.validationErrors.map((error) => error.message).join("; ")}\n`);
        return 3;
      }
      return exitCodeForVerdict(report.score.verdict, scanArgs.failOn);
    }

    if (command === "rules" && subcommand === "list") {
      for (const rule of scanRules) {
        io.stdout.write(`${rule.id}\t${rule.severity}\t${rule.category}\t${rule.title}\n`);
      }
      return 0;
    }

    if (command === "explain" && subcommand) {
      const rule = getRule(subcommand);
      io.stdout.write(
        [
          `${rule.id}: ${rule.title}`,
          `Severity: ${rule.severity}`,
          `Category: ${rule.category}`,
          `Score: ${rule.score}`,
          "",
          rule.description,
          "",
          `Remediation: ${rule.remediation}`,
          ""
        ].join("\n")
      );
      return 0;
    }

    throw new Error("Unknown command.");
  } catch (error) {
    io.stderr.write(`${error instanceof Error ? error.message : String(error)}\n\n${usage()}\n`);
    return 3;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
