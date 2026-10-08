// CLI agent giả cho test: in stream-json kiểu Claude Code, sửa file trong cwd (sandbox).
import { writeFileSync } from "node:fs";

const prompt = process.argv[2] ?? "";
const out = (o) => process.stdout.write(`${JSON.stringify(o)}\n`);

if (process.env.FAKE_SLEEP) {
  setTimeout(() => {}, 60_000);
} else {
  out({ type: "system", subtype: "init", ...(process.env.FAKE_SESSION ? { session_id: process.env.FAKE_SESSION } : {}) });
  const resumeAt = process.argv.indexOf("--resume");
  if (resumeAt > 0) out({ type: "assistant", message: { content: [{ type: "text", text: `resume:${process.argv[resumeAt + 1]}` }] } });
  out({ type: "assistant", message: { content: [{ type: "text", text: `prompt:${prompt.split("\n")[0]}` }] } });
  out({ type: "assistant", message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: "a.md" } }] } });
  if (process.env.FAKE_TOKEN) console.log(`token=${process.env.FAKE_TOKEN}`);
  console.error("warn on stderr");
  writeFileSync("a.md", "# A edited by agent\n");
  writeFileSync("sub/new.md", "# New file\n");
  out({ type: "result", subtype: "success", is_error: false, result: "done" });
  process.exitCode = Number(process.env.FAKE_EXIT ?? 0);
}
