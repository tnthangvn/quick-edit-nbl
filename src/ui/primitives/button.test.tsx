// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Button, buttonVariants } from "@/ui/primitives/button";

afterEach(cleanup);

describe("Button", () => {
  it("loading: khoá nút, aria-busy, đổi nhãn", () => {
    render(
      <Button loading loadingText="Đang lưu…">
        Save
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveProperty("disabled", true);
    expect(btn.getAttribute("aria-busy")).toBe("true");
    expect(btn.textContent).toBe("Đang lưu…");
    expect(btn.dataset.status).toBe("loading");
  });

  it("success: nhãn successText", () => {
    render(
      <Button success successText="Đã lưu">
        Save
      </Button>,
    );
    expect(screen.getByRole("button").textContent).toBe("Đã lưu");
  });

  it("variant/size theo cva", () => {
    expect(buttonVariants({ variant: "primary", size: "sm" })).toContain("bg-primary");
    expect(buttonVariants({ variant: "quiet", size: "icon", active: true })).toContain("bg-primary-soft");
  });
});
