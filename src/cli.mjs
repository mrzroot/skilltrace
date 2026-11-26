import { scanWorkspace } from "./scanner.mjs";

const VERSION = "1.0.0";

export async function runCli(argv) {
  const cmd = argv[0];
  const asJson = argv.includes("--json");
  const strict = argv.includes("--strict");
  if (!cmd || cmd === "--help" || cmd === "-h") {
    console.log("skilltrace <scan|budget> [dir] [--max-tokens N] [--strict] [--json]");
    return 0;
  }
  if (cmd === "--version" || cmd === "-v") {
    console.log(`skilltrace ${VERSION}`);
    return 0;
  }
  let maxTokens = 8000;
  const maxIdx = argv.indexOf("--max-tokens");
  if (maxIdx !== -1 && argv[maxIdx + 1]) maxTokens = Number(argv[maxIdx + 1]) || 8000;
  const dir = argv.slice(1).find((a, i) => !a.startsWith("-") && i !== maxIdx) || ".";
  const res = scanWorkspace(dir, { maxTokens });

  if (asJson) {
    console.log(JSON.stringify(res, null, 2));
  } else {
    console.log(`skilltrace (${cmd}): ${res.files.length} file(s), ~${res.totalTokens}/${res.maxTokens} tokens, ${res.findings.length} finding(s)`);
    for (const f of res.findings) console.log(`  [${f.severity.toUpperCase()}] ${f.file}: ${f.code} - ${f.message}`);
  }
  return (strict ? res.findings.length > 0 : !res.ok) ? 1 : 0;
}
