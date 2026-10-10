import { describe, expect, it } from "vitest";
import type { CliRunEvent } from "@/client/api/generated/model";
import { buildCliTurn, toolKindOf } from "./cli-turn";

let seq = 0;
const ev = (e: Record<string, unknown>, sec = seq): CliRunEvent =>
  ({ runId: "r", seq: seq++, at: new Date(Date.UTC(2026, 9, 10, 0, 0, sec)).toISOString(), ...e }) as CliRunEvent;

describe("buildCliTurn", () => {
  it("gộp delta, ghép tool_result theo id, tách câu trả lời cuối khi run xong", () => {
    seq = 0;
    const events = [
      ev({ type: "THINKING", text: "Cần ", delta: false }),
      ev({ type: "THINKING", text: "đọc file", delta: true }),
      ev({ type: "MESSAGE", text: "Mình đọc spec trước.", delta: false }),
      ev({ type: "TOOL_CALL", toolId: "t1", name: "Read", input: "{}", target: "/s/a.md" }, 3),
      ev({ type: "TOOL_RESULT", toolId: "t1", output: "# A", isError: false }, 5),
      ev({ type: "TOOL_CALL", toolId: "t2", name: "Bash", input: "{}", target: "grep -n x a.md" }, 6),
      ev({ type: "TOOL_RESULT", toolId: "t2", output: "boom", isError: true }, 7),
      ev({ type: "MESSAGE", text: "Đã sửa ", delta: false }),
      ev({ type: "MESSAGE", text: "xong.", delta: true }),
      ev({ type: "USAGE", durationMs: 9000, costUsd: 0.02, inputTokens: 100, outputTokens: 20, numTurns: 3 }),
      ev({ type: "PROPOSAL", file: "a.md", isNewFile: false }),
    ];

    const running = buildCliTurn(events, false);
    expect(running.answer).toBeNull();
    expect(running.steps.at(-1)).toMatchObject({ kind: "text", text: "Đã sửa xong." });

    const done = buildCliTurn(events, true);
    expect(done.answer).toBe("Đã sửa xong.");
    expect(done.steps.map((s) => s.kind)).toEqual(["thinking", "text", "tool", "tool"]);
    expect(done.steps[0]).toMatchObject({ text: "Cần đọc file" });
    expect(done.steps[2]).toMatchObject({ toolKind: "READ", status: "DONE", output: "# A", durationMs: 2000 });
    expect(done.steps[3]).toMatchObject({ toolKind: "SEARCH", status: "ERROR" });
    expect(done.toolCount).toBe(2);
    expect(done.usage?.costUsd).toBe(0.02);
    expect(done.proposals).toEqual([{ key: expect.any(String), file: "a.md", isNewFile: false }]);
  });

  it("transcript cũ (TOOL_CALL không có toolId) và log thô", () => {
    seq = 0;
    const turn = buildCliTurn(
      [
        ev({ type: "TOOL_CALL", name: "Edit", input: "{}" }),
        ev({ type: "LOG", stream: "STDOUT", text: "a" }),
        ev({ type: "LOG", stream: "STDERR", text: "b" }),
      ],
      true,
    );
    expect(turn.steps[0]).toMatchObject({ kind: "tool", status: "DONE", target: null, toolKind: "EDIT" });
    expect(turn.steps[1]).toMatchObject({ kind: "log", text: "a\nb", streams: ["STDOUT", "STDERR"] });
    expect(turn.answer).toBeNull();
  });

  it("phân loại tool theo tên và lệnh shell", () => {
    expect(toolKindOf("mcp__fs__read_file", null)).toBe("READ");
    expect(toolKindOf("Bash", "cat a.md")).toBe("READ");
    expect(toolKindOf("Bash", "pnpm test")).toBe("EXEC");
    expect(toolKindOf("TodoWrite", null)).toBe("PLAN");
    expect(toolKindOf("weird", null)).toBe("OTHER");
  });
});

describe("targetFromInput / shortTarget", () => {
  it("tách đối tượng từ input JSON cũ (kể cả bị cắt) và rút gọn đường dẫn dài", async () => {
    const { targetFromInput, shortTarget } = await import("./cli-turn");
    expect(targetFromInput('{"AbsolutePath":"/tmp/x/specs/a.md"}')).toBe("/tmp/x/specs/a.md");
    expect(targetFromInput('{"command":"ls -la","x":"' + "y".repeat(20) + "…")).toBe("ls -la");
    expect(targetFromInput("{}")).toBeNull();
    expect(shortTarget("/tmp/spec-studio-run-01a11c9f-67a2/specs/test/overview.md")).toBe("…/test/overview.md");
    expect(shortTarget("grep -rn foo /very/long/path/that/keeps/going/and/going")).toBe("grep -rn foo /very/long/path/that/keeps/going/and/going");
  });
});
