import { promises as fs } from "node:fs";
import path from "node:path";
import {
  createFindingId,
  maskSecretEvidence,
  normalizePathForReport,
  splitLines,
  type Finding,
  type ScoreResult,
  type ScannerResult,
  type SourceFile
} from "@vibeproof/core";
import { getRule } from "@vibeproof/rules";

export interface DiscoveryOptions {
  fetchImpl?: typeof fetch;
  githubToken?: string;
  maxBytesPerFile?: number;
}

export interface ScannerDefinition {
  id: string;
  run(files: SourceFile[]): Finding[];
}

const DEFAULT_MAX_BYTES = 1024 * 1024;

const priorityNames = [
  "readme.md",
  "agents.md",
  "claude.md",
  "gemini.md",
  ".cursorrules",
  ".github/copilot-instructions.md",
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "pyproject.toml",
  "requirements.txt",
  "setup.py",
  "dockerfile",
  "docker-compose.yml",
  ".mcp.json",
  "mcp.json"
];

const priorityExtensions = [".sh", ".bash", ".ps1", ".cmd", ".bat"];
const ignoredDirectories = new Set([".git", "node_modules", "dist", ".next", "coverage", ".venv", "__pycache__"]);

export function isSafeRelativePath(filePath: string): boolean {
  const raw = filePath.replace(/\\/g, "/");
  if (!raw || raw.includes("\0") || raw.startsWith("/") || /^[A-Za-z]:\//.test(raw)) {
    return false;
  }
  const normalized = normalizePathForReport(filePath);
  return normalized.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

export function isPriorityScanFile(filePath: string): boolean {
  if (!isSafeRelativePath(filePath)) {
    return false;
  }
  const normalized = normalizePathForReport(filePath).toLowerCase();
  const base = path.posix.basename(normalized);
  return (
    priorityNames.includes(normalized) ||
    priorityNames.includes(base) ||
    normalized.includes("/.github/") ||
    normalized.includes("/.vscode/") ||
    normalized.includes("mcp") ||
    priorityExtensions.some((extension) => normalized.endsWith(extension))
  );
}

export async function discoverLocalFiles(root: string, options: DiscoveryOptions = {}): Promise<SourceFile[]> {
  const resolvedRoot = path.resolve(root);
  const maxBytes = options.maxBytesPerFile ?? DEFAULT_MAX_BYTES;
  const files: SourceFile[] = [];

  async function walk(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      const relative = normalizePathForReport(path.relative(resolvedRoot, fullPath));
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) {
          await walk(fullPath);
        }
        continue;
      }
      if (!entry.isFile() || !isSafeRelativePath(relative) || !isPriorityScanFile(relative)) {
        continue;
      }
      const stat = await fs.stat(fullPath);
      if (stat.size > maxBytes) {
        continue;
      }
      const content = await fs.readFile(fullPath, "utf8");
      files.push({
        path: relative,
        absolutePath: fullPath,
        content,
        size: stat.size,
        source: "local"
      });
    }
  }

  await walk(resolvedRoot);
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

export function parseGithubUrl(target: string): { owner: string; repo: string } {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    throw new Error("Target must be a valid GitHub URL or a local path.");
  }
  if (url.protocol !== "https:" || url.hostname !== "github.com") {
    throw new Error("Only https://github.com/owner/repo URLs are supported.");
  }
  const [owner, repo, extra] = url.pathname.split("/").filter(Boolean);
  if (!owner || !repo || extra) {
    throw new Error("GitHub URL must use the form https://github.com/owner/repo.");
  }
  return { owner, repo: repo.replace(/\.git$/, "") };
}

export async function discoverGithubFiles(target: string, options: DiscoveryOptions = {}): Promise<SourceFile[]> {
  const { owner, repo } = parseGithubUrl(target);
  const fetchImpl = options.fetchImpl ?? fetch;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "vibeproof-static-scanner"
  };
  if (options.githubToken) {
    headers.Authorization = `Bearer ${options.githubToken}`;
  }

  const repoResponse = await fetchImpl(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!repoResponse.ok) {
    throw new Error(`GitHub repository lookup failed with HTTP ${repoResponse.status}.`);
  }
  const repoBody = (await repoResponse.json()) as { default_branch?: string };
  const defaultBranch = repoBody.default_branch ?? "main";

  const treeResponse = await fetchImpl(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`,
    { headers }
  );
  if (!treeResponse.ok) {
    throw new Error(`GitHub tree lookup failed with HTTP ${treeResponse.status}.`);
  }
  const treeBody = (await treeResponse.json()) as {
    tree?: Array<{ path?: string; type?: string; size?: number }>;
  };

  const candidates = (treeBody.tree ?? [])
    .filter((entry) => entry.type === "blob" && entry.path && isSafeRelativePath(entry.path) && isPriorityScanFile(entry.path))
    .filter((entry) => (entry.size ?? 0) <= (options.maxBytesPerFile ?? DEFAULT_MAX_BYTES))
    .slice(0, 200);

  const files: SourceFile[] = [];
  for (const entry of candidates) {
    const filePath = normalizePathForReport(entry.path ?? "");
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(defaultBranch)}/${filePath
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;
    const rawResponse = await fetchImpl(rawUrl, { headers: { "User-Agent": "vibeproof-static-scanner" } });
    if (!rawResponse.ok) {
      continue;
    }
    const content = await rawResponse.text();
    files.push({
      path: filePath,
      content,
      size: content.length,
      source: "github"
    });
  }
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

export function runScannerDefinitions(files: SourceFile[], definitions: ScannerDefinition[]): ScannerResult[] {
  return definitions.map((scanner) => {
    const startedAt = new Date().toISOString();
    try {
      const findings = scanner.run(files);
      return {
        scannerId: scanner.id,
        status: "completed",
        findings,
        errors: [],
        filesScanned: files.length,
        startedAt,
        completedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        scannerId: scanner.id,
        status: "failed",
        findings: [],
        errors: [error instanceof Error ? error.message : String(error)],
        filesScanned: files.length,
        startedAt,
        completedAt: new Date().toISOString()
      };
    }
  });
}

export function runStaticScanners(files: SourceFile[]): ScannerResult[] {
  return runScannerDefinitions(files, scannerDefinitions);
}

function makeFinding(ruleId: string, file: SourceFile, line: number, evidence: string): Finding {
  const rule = getRule(ruleId);
  const maskedEvidence = maskSecretEvidence(evidence.trim()).slice(0, 240);
  return {
    id: createFindingId(rule.id, file.path, line, maskedEvidence),
    ruleId: rule.id,
    category: rule.category,
    severity: rule.severity,
    filePath: file.path,
    startLine: line,
    evidence: maskedEvidence,
    explanation: rule.description,
    remediation: rule.remediation,
    scoreContribution: rule.score
  };
}

function findingForNeedle(ruleId: string, file: SourceFile, needle: RegExp | string): Finding {
  const lines = splitLines(file.content);
  const index = lines.findIndex((line) => (typeof needle === "string" ? line.includes(needle) : needle.test(line)));
  const line = index >= 0 ? index + 1 : 1;
  return makeFinding(ruleId, file, line, lines[index] ?? splitLines(file.content)[0] ?? file.path);
}

function isAgentInstructionFile(filePath: string): boolean {
  const normalized = normalizePathForReport(filePath).toLowerCase();
  return (
    normalized === "readme.md" ||
    normalized.startsWith("readme.") ||
    ["agents.md", "claude.md", "gemini.md", ".cursorrules", ".github/copilot-instructions.md"].includes(normalized)
  );
}

function isContainerFile(filePath: string): boolean {
  const normalized = normalizePathForReport(filePath).toLowerCase();
  return normalized.endsWith("dockerfile") || normalized.endsWith("docker-compose.yml") || normalized.endsWith("docker-compose.yaml");
}

function scriptScanner(files: SourceFile[]): Finding[] {
  const findings: Finding[] = [];
  for (const file of files) {
    if (file.path.toLowerCase().endsWith("package.json")) {
      try {
        const manifest = JSON.parse(file.content) as { scripts?: Record<string, string>; dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
        for (const [scriptName, command] of Object.entries(manifest.scripts ?? {})) {
          if (["preinstall", "install", "postinstall", "prepare"].includes(scriptName)) {
            findings.push(findingForNeedle("SCRIPT_INSTALL_HOOK_HIGH", file, `"${scriptName}"`));
          }
          if (/(curl|wget|Invoke-WebRequest|iwr).*(\||;|&&).*(sh|bash|powershell|pwsh|node|python|iex|Invoke-Expression)/i.test(command)) {
            findings.push(findingForNeedle("SCRIPT_REMOTE_EXEC_CRITICAL", file, `"${scriptName}"`));
          }
          if (/\b(eval|Function|Invoke-Expression|iex)\b/i.test(command)) {
            findings.push(findingForNeedle("SCRIPT_DYNAMIC_EVAL_HIGH", file, `"${scriptName}"`));
          }
        }
      } catch {
        continue;
      }
    }

    if (/\.(sh|bash|cmd|bat|ps1)$/i.test(file.path)) {
      for (const line of splitLines(file.content)) {
        if (/(curl|wget|Invoke-WebRequest|iwr).*(\||;|&&).*(sh|bash|powershell|pwsh|node|python|iex|Invoke-Expression)/i.test(line)) {
          findings.push(findingForNeedle("SCRIPT_REMOTE_EXEC_CRITICAL", file, line.trim().slice(0, 40)));
        } else if (/\b(eval|Invoke-Expression|iex|FromBase64String|DownloadString)\b/i.test(line)) {
          findings.push(findingForNeedle("SCRIPT_DYNAMIC_EVAL_HIGH", file, line.trim().slice(0, 40)));
        }
      }
    }
  }
  return findings;
}

function dependencyScanner(files: SourceFile[]): Finding[] {
  const findings: Finding[] = [];
  for (const file of files) {
    if (!file.path.toLowerCase().endsWith("package.json")) {
      continue;
    }
    let manifest: { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; optionalDependencies?: Record<string, string> };
    try {
      manifest = JSON.parse(file.content) as typeof manifest;
    } catch {
      continue;
    }
    const groups = [manifest.dependencies, manifest.devDependencies, manifest.optionalDependencies];
    for (const dependencies of groups) {
      for (const [name, specifier] of Object.entries(dependencies ?? {})) {
        if (/^https?:\/\//i.test(specifier)) {
          findings.push(findingForNeedle("DEPENDENCY_URL_MEDIUM", file, name));
        }
        if (/^(git\+|github:|git:\/\/)/i.test(specifier)) {
          findings.push(findingForNeedle("DEPENDENCY_GIT_MEDIUM", file, name));
        }
      }
    }
  }
  return findings;
}

const dangerousAgentPatterns = [
  /ignore (all )?(previous|prior) instructions/i,
  /(disable|skip|bypass).*(security|review|validation|checks?)/i,
  /(print|reveal|expose).*(env|environment|secret|token|api key)/i,
  /(run|execute).*(without|no).*(confirmation|asking|approval)/i,
  /(download|curl|wget).*(and|then).*(run|execute|sh|bash|powershell)/i,
  /(delete|remove).*(user files|home directory|all files)/i
];

const safeNegatedDangerPatterns = [
  /\b(do not|don't|never|must not|should not|prohibit|forbid)\b.*\b(print|reveal|expose)\b.*\b(env|environment|secrets?|tokens?|api keys?|variables?)\b/i,
  /\b(do not|don't|never|must not|should not|prohibit|forbid)\b.*\b(disable|skip|bypass)\b.*\b(security|review|validation|checks?)\b/i,
  /\b(do not|don't|never|must not|should not|prohibit|forbid)\b.*\b(run|execute)\b.*\b(without|no)\b.*\b(confirmation|asking|approval)\b/i,
  /\b(do not|don't|never|must not|should not|prohibit|forbid)\b.*\b(download|curl|wget)\b.*\b(and|then)\b.*\b(run|execute|sh|bash|powershell)\b/i
];

const safetyProcedureBanPatterns = [
  /\b(do not|don't|never|must not|should not|prohibit|forbid)\b.*\b(ask|wait)\b.*\b(confirmation|approval)\b/i,
  /\b(do not|don't|never|must not|should not|prohibit|forbid)\b.*\b(perform|do|run)\b.*\b(security review|security check|validation|checks?)\b/i,
  /\b(do not|don't|never|must not|should not|prohibit|forbid)\b.*\b(show|tell|notify|inform)\b.*\b(user|instruction)\b/i
];

export function isDangerousAgentInstruction(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || safeNegatedDangerPatterns.some((pattern) => pattern.test(trimmed))) {
    return false;
  }
  return safetyProcedureBanPatterns.some((pattern) => pattern.test(trimmed)) || dangerousAgentPatterns.some((pattern) => pattern.test(trimmed));
}

function agentInstructionScanner(files: SourceFile[]): Finding[] {
  const findings: Finding[] = [];
  for (const file of files.filter((candidate) => isAgentInstructionFile(candidate.path))) {
    for (const line of splitLines(file.content)) {
      if (isDangerousAgentInstruction(line)) {
        findings.push(findingForNeedle("AGENT_DANGEROUS_INSTRUCTION_HIGH", file, line.trim().slice(0, 40)));
      }
    }
  }
  return findings;
}

const broadMcpFilesystemAccessPattern =
  /(~(?:[/\\]|$|["'\s,\]}])|%USERPROFILE%|C:\\+Users(?:\\+|$|["'\s,\]}])|\/home(?:\/|$|["'\s,\]}])|\/Users(?:\/|$|["'\s,\]}])|\/root(?:\/|$|["'\s,\]}])|(?:^|["'\s:,])(?:\/)(?=$|["'\s,\]}])|\.ssh|\.aws|browser profile|AppData)/i;

function mcpScanner(files: SourceFile[]): Finding[] {
  const findings: Finding[] = [];
  for (const file of files.filter((candidate) => candidate.path.toLowerCase().includes("mcp"))) {
    const content = file.content;
    if (broadMcpFilesystemAccessPattern.test(content)) {
      findings.push(findingForNeedle("MCP_BROAD_FILESYSTEM_HIGH", file, broadMcpFilesystemAccessPattern));
    }
    if (/(shell|command|exec|powershell|bash|cmd\.exe)/i.test(content)) {
      findings.push(findingForNeedle("MCP_SHELL_PERMISSION_HIGH", file, /(shell|command|exec|powershell|bash|cmd\.exe)/i));
    }
  }
  return findings;
}

function containerScanner(files: SourceFile[]): Finding[] {
  const findings: Finding[] = [];
  for (const file of files.filter((candidate) => isContainerFile(candidate.path))) {
    if (/(privileged:\s*true|--privileged|network_mode:\s*host|pid:\s*host|cap_add:)/i.test(file.content)) {
      findings.push(findingForNeedle("CONTAINER_PRIVILEGED_HIGH", file, /(privileged|network_mode|pid:|cap_add)/i));
    }
    if (/docker\.sock/i.test(file.content)) {
      findings.push(findingForNeedle("CONTAINER_DOCKER_SOCKET_CRITICAL", file, /docker\.sock/i));
    }
  }
  return findings;
}

function secretScanner(files: SourceFile[]): Finding[] {
  const findings: Finding[] = [];
  const secretPatterns = [
    /sk-[A-Za-z0-9_-]{20,}/,
    /(api[_-]?key|token|secret|password)\s*[:=]\s*["']?[A-Za-z0-9_.-]{16,}/i,
    /https?:\/\/[^/\s:@]+:[^/\s:@]+@/i
  ];
  for (const file of files) {
    if (file.path.endsWith(".example")) {
      continue;
    }
    for (const line of splitLines(file.content)) {
      if (secretPatterns.some((pattern) => pattern.test(line))) {
        findings.push(findingForNeedle("SECRET_EXPOSED_CRITICAL", file, line.trim().slice(0, 40)));
      }
    }
  }
  return findings;
}

export function scoreFindings(findings: Finding[]): ScoreResult {
  const seen = new Set<string>();
  let duplicateSuppressed = 0;
  let rawScore = 0;
  const breakdown = [];
  let forceBlock = false;

  for (const finding of findings) {
    const rule = getRule(finding.ruleId);
    const key = `${finding.ruleId}:${finding.filePath}:${finding.startLine}:${finding.evidence}`;
    if (seen.has(key)) {
      duplicateSuppressed += 1;
      continue;
    }
    seen.add(key);
    rawScore += rule.score;
    forceBlock = forceBlock || Boolean(rule.forceBlock);
    breakdown.push({
      findingId: finding.id,
      ruleId: finding.ruleId,
      contribution: rule.score
    });
  }

  const finalScore = Math.min(100, rawScore);
  const verdict: ScoreResult["verdict"] = forceBlock || finalScore >= 60 ? "BLOCK" : finalScore >= 25 ? "WARN" : "ALLOW";
  return { rawScore, duplicateSuppressed, breakdown, forceBlock, finalScore, verdict };
}

const scannerDefinitions: ScannerDefinition[] = [
  { id: "script-scanner", run: scriptScanner },
  { id: "agent-instruction-scanner", run: agentInstructionScanner },
  { id: "mcp-permission-scanner", run: mcpScanner },
  { id: "container-scanner", run: containerScanner },
  { id: "secret-scanner", run: secretScanner },
  { id: "manifest-consistency-scanner", run: dependencyScanner }
];
