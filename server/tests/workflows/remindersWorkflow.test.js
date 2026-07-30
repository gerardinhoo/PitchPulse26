import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("match reminders workflow", () => {
  it("keeps manual dispatch and has no scheduled cron after tournament completion", () => {
    const workflowPath = resolve(
      process.cwd(),
      process.cwd().endsWith("server") ? "../.github/workflows/reminders.yml" : ".github/workflows/reminders.yml",
    );
    const yaml = readFileSync(workflowPath, "utf8");

    expect(yaml).toMatch(/workflow_dispatch:/);
    expect(yaml).not.toMatch(/^\s*schedule:/m);
    expect(yaml).not.toMatch(/cron:/);
    expect(yaml).toMatch(/disabled after the World Cup 2026/i);
  });
});
