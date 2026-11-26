# skilltrace

> **Static linter, contradiction detector, permission/secret auditor, and token-budget profiler for `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.cursor/rules`, and `SKILL.md`.**

Multi-tool repos accumulate contradictory instructions (`use npm` in `CLAUDE.md`, `use pnpm` in `AGENTS.md`), bloated context rules, unsafe bypass flags, and leaked secrets. `skilltrace` audits your instruction files offline in CI.

## Install & Usage

```bash
npm i -g github:mrzroot/skilltrace
skilltrace scan . --max-tokens 6000 --strict --json
skilltrace budget .
```

- **Zero runtime dependencies** (Node.js 18+ ESM + `.d.ts` included)
- **Live Demo:** https://mrzroot.github.io/skilltrace/
- **License:** MIT
