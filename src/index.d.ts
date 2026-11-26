export interface TraceFinding { file: string; severity: "error" | "warn"; code: string; message: string; }
export function estimateTokens(text: string): number;
export function discoverInstructionFiles(rootDir: string): string[];
export function scanWorkspace(rootDir: string, options?: { maxTokens?: number }): {
  ok: boolean;
  totalTokens: number;
  maxTokens: number;
  files: Array<{ file: string; chars: number; tokens: number }>;
  findings: TraceFinding[];
};
