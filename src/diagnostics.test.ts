// Regression cover for the two contracts that made `lspx diagnostics` report
// a clean bill of health for files full of errors.

import { describe, expect, it } from "bun:test";
import { clientCapabilities } from "./lsp/client.ts";
import { formatDiagnostics } from "./format.ts";

const opts = { workspaceRoot: "/ws", json: false, snippet: false };

describe("diagnostics client capabilities", () => {
  // Without this, tsserver-based servers never send publishDiagnostics at all,
  // and since neither of them advertises a diagnosticProvider there is no pull
  // model to fall back on — the command can only ever report nothing.
  it("advertises publishDiagnostics so servers push at all", () => {
    const caps = clientCapabilities();
    expect(caps.textDocument?.publishDiagnostics).toBeDefined();
  });

  it("still advertises the 3.17 pull model for servers that prefer it", () => {
    expect(clientCapabilities().textDocument?.diagnostic).toBeDefined();
  });
});

describe("formatDiagnostics availability", () => {
  // "The server never answered" and "the server says this file is clean" are
  // different facts. Collapsing them is what let a broken file read as healthy.
  it("reports an unavailable result instead of a clean bill of health", () => {
    const out = formatDiagnostics({ file: "/ws/src/a.ts", diagnostics: null }, opts);
    expect(out).toContain("unavailable");
    expect(out).not.toContain("no diagnostics");
  });

  it("reports an empty list as genuinely clean", () => {
    const out = formatDiagnostics({ file: "/ws/src/a.ts", diagnostics: [] }, opts);
    expect(out).toContain("no diagnostics");
  });

  it("marks unavailability explicitly in JSON rather than as an empty list", () => {
    const out = JSON.parse(
      formatDiagnostics({ file: "/ws/src/a.ts", diagnostics: null }, { ...opts, json: true }),
    );
    expect(out.available).toBe(false);
    expect(out.diagnostics).toBeNull();
  });

  it("renders real diagnostics with 1-indexed positions", () => {
    const out = formatDiagnostics(
      {
        file: "/ws/src/a.ts",
        diagnostics: [{
          range: { start: { line: 0, character: 6 }, end: { line: 0, character: 7 } },
          severity: 1,
          message: "Type 'string' is not assignable to type 'number'.",
          source: "typescript",
        }],
      },
      { ...opts, json: true },
    );
    expect(JSON.parse(out)[0]).toMatchObject({
      line: 1,
      col: 7,
      severity: "error",
      source: "typescript",
    });
  });
});
