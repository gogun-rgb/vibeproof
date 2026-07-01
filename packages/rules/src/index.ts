import type { ScanRule } from "@vibeproof/core";

export const scanRules = [
  {
    id: "SCRIPT_INSTALL_HOOK_HIGH",
    title: "Lifecycle install hook can execute code",
    category: "script",
    severity: "high",
    description: "Package lifecycle hooks run during installation and can execute arbitrary commands.",
    remediation: "Inspect the hook manually before installing, or remove the hook if it is not essential.",
    score: 35
  },
  {
    id: "SCRIPT_REMOTE_EXEC_CRITICAL",
    title: "Remote download piped into execution",
    category: "script",
    severity: "critical",
    description: "Remote content appears to be downloaded and executed in one command path.",
    remediation: "Do not pipe remote content into a shell. Pin, download, inspect, and verify artifacts first.",
    score: 70,
    forceBlock: true
  },
  {
    id: "SCRIPT_DYNAMIC_EVAL_HIGH",
    title: "Dynamic code execution",
    category: "script",
    severity: "high",
    description: "Dynamic evaluation can hide behavior from static review and execute untrusted content.",
    remediation: "Replace dynamic evaluation with explicit, auditable code paths.",
    score: 40
  },
  {
    id: "AGENT_DANGEROUS_INSTRUCTION_HIGH",
    title: "Agent instruction asks for unsafe behavior",
    category: "agent-instruction",
    severity: "high",
    description: "Repository instructions appear to ask an AI agent to bypass review or run risky commands.",
    remediation: "Remove instructions that bypass confirmation, reveal secrets, or weaken security checks.",
    score: 35
  },
  {
    id: "MCP_BROAD_FILESYSTEM_HIGH",
    title: "Broad MCP filesystem access",
    category: "mcp",
    severity: "high",
    description: "MCP configuration appears to grant broad filesystem access such as home or root directories.",
    remediation: "Limit MCP filesystem access to the smallest project-specific directory.",
    score: 40
  },
  {
    id: "MCP_SHELL_PERMISSION_HIGH",
    title: "MCP shell execution permission",
    category: "mcp",
    severity: "high",
    description: "MCP configuration appears to expose shell or command execution capabilities.",
    remediation: "Disable shell tools unless they are required and tightly scoped.",
    score: 35
  },
  {
    id: "CONTAINER_PRIVILEGED_HIGH",
    title: "Privileged container setting",
    category: "container",
    severity: "high",
    description: "Container configuration grants elevated privileges or host namespace access.",
    remediation: "Remove privileged mode, host networking, host PID, or unnecessary capabilities.",
    score: 40
  },
  {
    id: "CONTAINER_DOCKER_SOCKET_CRITICAL",
    title: "Docker socket mounted into container",
    category: "container",
    severity: "critical",
    description: "Mounting the Docker socket can grant host-level control from inside a container.",
    remediation: "Avoid mounting the Docker socket. Use least-privilege build or scan alternatives.",
    score: 80,
    forceBlock: true
  },
  {
    id: "SECRET_EXPOSED_CRITICAL",
    title: "Secret-like value committed in text",
    category: "secret",
    severity: "critical",
    description: "A token, API key, or password-like value appears in a scanned file.",
    remediation: "Revoke the secret, remove it from the repository, and use environment-based configuration.",
    score: 80,
    forceBlock: true
  },
  {
    id: "DEPENDENCY_URL_MEDIUM",
    title: "Dependency points directly to a URL",
    category: "dependency",
    severity: "medium",
    description: "Direct URL dependencies can change outside the normal registry review path.",
    remediation: "Use a pinned registry version or verify the downloaded artifact with a checksum.",
    score: 20
  },
  {
    id: "DEPENDENCY_GIT_MEDIUM",
    title: "Dependency points to a Git repository",
    category: "dependency",
    severity: "medium",
    description: "Git dependencies can change if not pinned to a reviewed commit.",
    remediation: "Pin Git dependencies to a commit and review the referenced source.",
    score: 20
  }
] satisfies ScanRule[];

export const ruleById = new Map(scanRules.map((rule) => [rule.id, rule]));

export function getRule(ruleId: string): ScanRule {
  const rule = ruleById.get(ruleId);
  if (!rule) {
    throw new Error(`Unknown rule: ${ruleId}`);
  }
  return rule;
}

