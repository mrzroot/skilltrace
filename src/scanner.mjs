import fs from "node:fs";
import path from "node:path";

const TARGET_NAMES = new Set(["CLAUDE.md", "AGENTS.md", "GEMINI.md", "SKILL.md", ".cursorrules"]);
const SECRET_RE = /(?:sk-(?:live|proj|ant)-[A-Za-z0-9_-]{12,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})/;
const UNSAFE_PERM_RE = /(?:--dangerously-skip-permissions|--no-verify\b|rm\s+-rf\s+\/|chmod\s+777\b)/i;
const DIRECTIVE_PAIRS = [
  ["pkg-npm-vs-pnpm", /\buse npm\b/i, /\b(?:never use npm|always use pnpm|use pnpm instead)\b/i, "Conflicting package manager guidance (npm vs pnpm)."],
  ["indent-tabs-vs-spaces", /\buse tabs\b/i, /\buse (?:2|4|two|four) spaces\b/i, "Conflicting indentation guidance (tabs vs spaces)."],
  ["tests-skip-vs-require", /\bnever skip tests\b|\balways run tests\b/i, /\bskip tests\b|\b--no-verify\b/i, "Conflicting test verification rule."],
];

export function estimateTokens(text) {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function discoverInstructionFiles(rootDir) {
  const out = [];
  function walk(dir, depth) {
    if (depth > 4) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === ".git" || ent.name === "node_modules") continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full, depth + 1);
      } else {
        const rel = path.relative(rootDir, full).replace(/\\/g, "/");
        if (TARGET_NAMES.has(ent.name) || rel.startsWith(".cursor/rules/") || rel.startsWith(".github/copilot")) {
          out.push(full);
        }
      }
    }
  }
  walk(rootDir, 0);
  return out.sort();
}

export function scanWorkspace(rootDir, { maxTokens = 8000 } = {}) {
  const paths = discoverInstructionFiles(rootDir);
  const files = [];
  const contents = [];
  const findings = [];
  let totalTokens = 0;

  for (const full of paths) {
    const rel = path.relative(rootDir, full).replace(/\\/g, "/");
    const raw = fs.readFileSync(full, "utf8");
    const tokens = estimateTokens(raw);
    totalTokens += tokens;
    files.push({ file: rel, chars: raw.length, tokens });
    contents.push({ file: rel, raw });

    if (SECRET_RE.test(raw)) {
      findings.push({ file: rel, severity: "error", code: "SECRET_LEAK", message: "Potential API token/key literal inside agent instructions." });
    }
    if (UNSAFE_PERM_RE.test(raw)) {
      findings.push({ file: rel, severity: "warn", code: "UNSAFE_DIRECTIVE", message: "Unsafe bypass flag or destructive wildcard command found in instructions." });
    }
    if (/[\u202a-\u202e\u2066-\u2069]/.test(raw)) {
      findings.push({ file: rel, severity: "error", code: "BIDI_HIDDEN_CONTROL", message: "Hidden bidirectional control character detected in instruction file." });
    }
  }

  for (const [id, reA, reB, msg] of DIRECTIVE_PAIRS) {
    const hitsA = contents.filter((c) => reA.test(c.raw)).map((c) => c.file);
    const hitsB = contents.filter((c) => reB.test(c.raw)).map((c) => c.file);
    if (hitsA.length && hitsB.length) {
      findings.push({
        file: `${hitsA[0]} <-> ${hitsB[0]}`,
        severity: "warn",
        code: `CONFLICT_${id.toUpperCase().replace(/-/g, "_")}`,
        message: msg,
      });
    }
  }

  if (totalTokens > maxTokens) {
    findings.push({ file: "<workspace>", severity: "warn", code: "TOKEN_BUDGET_EXCEEDED", message: `Combined instructions ${totalTokens} tokens exceed budget ${maxTokens}.` });
  }

  return {
    ok: !findings.some((f) => f.severity === "error"),
    totalTokens,
    maxTokens,
    files,
    findings,
  };
}
