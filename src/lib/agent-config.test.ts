import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const agentsDir = join(process.cwd(), ".codex", "agents");

function readAgentConfig(fileName: string) {
  const filePath = join(agentsDir, fileName);
  expect(existsSync(filePath)).toBe(true);
  return readFileSync(filePath, "utf8");
}

function parseAgentConfig(config: string) {
  const values = new Map<string, string>();
  const multiLineMatch = config.match(/developer_instructions\s*=\s*"""([\s\S]*?)"""/);

  for (const line of config.split("\n")) {
    const match = line.match(/^([a-z_]+)\s*=\s*"([^"]*)"$/);
    if (match) {
      values.set(match[1], match[2]);
    }
  }

  if (multiLineMatch) {
    values.set("developer_instructions", multiLineMatch[1]);
  }

  return values;
}

describe("Pickus UI subagents", () => {
  it("configures a workspace-write worker for scoped UI polish", () => {
    const config = parseAgentConfig(readAgentConfig("pickus-ui-worker.toml"));

    expect(config.get("name")).toBe("pickus-ui-worker");
    expect(config.get("sandbox_mode")).toBe("workspace-write");
    expect(config.get("developer_instructions")).toContain("AGENTS.md");
    expect(config.get("developer_instructions")).toContain("src/components/room-workspace.tsx");
    expect(config.get("developer_instructions")).toContain("기능/API/DB");
  });

  it("configures a read-only evaluator for UI regression review", () => {
    const config = parseAgentConfig(readAgentConfig("pickus-ui-evaluator.toml"));

    expect(config.get("name")).toBe("pickus-ui-evaluator");
    expect(config.get("sandbox_mode")).toBe("read-only");
    expect(config.get("developer_instructions")).toContain("접근성");
    expect(config.get("developer_instructions")).toContain("모바일");
    expect(config.get("developer_instructions")).toContain("overflow");
  });
});
