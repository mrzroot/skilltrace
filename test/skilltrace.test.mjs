import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { scanWorkspace } from "../src/index.mjs";

test("scanWorkspace catches cross-file conflicts, secrets, and token budget", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skilltrace-"));
  fs.writeFileSync(path.join(dir, "CLAUDE.md"), "Always use npm for installs.\n");
  fs.writeFileSync(path.join(dir, "AGENTS.md"), "Always use pnpm instead.\nToken: " + "sk-live-" + "1234567890abcdef\n");
  const res = scanWorkspace(dir, { maxTokens: 5 });
  assert.equal(res.ok, false);
  const codes = new Set(res.findings.map((f) => f.code));
  assert.ok(codes.has("SECRET_LEAK"));
  assert.ok(codes.has("CONFLICT_PKG_NPM_VS_PNPM"));
  assert.ok(codes.has("TOKEN_BUDGET_EXCEEDED"));
});
