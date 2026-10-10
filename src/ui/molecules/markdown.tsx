"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/ui/utils";

/**
 * Markdown đã render (GFM: bảng, checklist, gạch). Không render HTML thô (mặc định của react-markdown), link mở tab mới.
 * - `chat`: câu trả lời của Agent, chữ 13/20, heading nhỏ cho khung chat hẹp.
 * - `document`: Preview một file spec trong Workspace, chữ 14/22, heading theo cấp, cột đọc tối đa ~72ch.
 * Code, tên file dùng `font-mono` theo design README.
 */
const markdownVariants = cva("min-w-0 break-words text-foreground", {
  variants: {
    variant: {
      chat: "text-[13px] leading-5",
      document: "mx-auto max-w-[72ch] px-6 py-5 text-sm leading-[22px]",
    },
  },
  defaultVariants: { variant: "chat" },
});

type Variant = NonNullable<VariantProps<typeof markdownVariants>["variant"]>;

const headingVariants = cva("font-semibold first:mt-0", {
  variants: {
    variant: { chat: "", document: "" },
    level: { 1: "", 2: "", 3: "", 4: "" },
  },
  compoundVariants: [
    { variant: "chat", level: [1, 2], className: "mt-3 mb-1 text-sm leading-5" },
    { variant: "chat", level: [3, 4], className: "mt-3 mb-1 text-[13px] leading-5" },
    { variant: "document", level: 1, className: "mt-6 mb-3 border-b border-border pb-2 text-xl leading-7" },
    { variant: "document", level: 2, className: "mt-6 mb-2 text-base leading-6" },
    { variant: "document", level: 3, className: "mt-4 mb-1.5 text-sm leading-5" },
    { variant: "document", level: 4, className: "mt-3 mb-1 text-sm leading-5 font-medium text-muted-foreground" },
  ],
});

function makeComponents(variant: Variant): Components {
  const heading = (level: 1 | 2 | 3 | 4) =>
    function Heading({ node: _node, ...props }: React.ComponentProps<"h1"> & { node?: unknown }) {
      const Tag = `h${Math.min(level + (variant === "chat" ? 2 : 0), 6)}` as "h3";
      return <Tag className={headingVariants({ variant, level })} {...props} />;
    };
  return {
    p: ({ node: _node, ...props }) => <p className="my-0 [&:not(:first-child)]:mt-2" {...props} />,
    h1: heading(1),
    h2: heading(2),
    h3: heading(3),
    h4: heading(4),
    ul: ({ node: _node, ...props }) => <ul className="my-1.5 list-disc space-y-0.5 pl-5 marker:text-muted-foreground" {...props} />,
    ol: ({ node: _node, ...props }) => <ol className="my-1.5 list-decimal space-y-0.5 pl-5 marker:text-muted-foreground" {...props} />,
    li: ({ node: _node, className, ...props }) => (
      <li className={cn("pl-0.5 [&>input]:mr-1.5 [&>input]:align-middle", className?.includes("task-list-item") && "-ml-5 list-none")} {...props} />
    ),
    a: ({ node: _node, ...props }) => <a className="text-primary underline-offset-2 hover:underline" target="_blank" rel="noreferrer noopener" {...props} />,
    blockquote: ({ node: _node, ...props }) => <blockquote className="my-2 border-l-2 border-border pl-3 text-muted-foreground" {...props} />,
    hr: () => <hr className="my-4 border-border" />,
    table: ({ node: _node, ...props }) => (
      <div className="my-2 overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-xs leading-4" {...props} />
      </div>
    ),
    th: ({ node: _node, ...props }) => <th className="border-b border-border bg-muted px-2 py-1 text-left font-medium" {...props} />,
    td: ({ node: _node, ...props }) => <td className="border-b border-border px-2 py-1 align-top last:border-b-0" {...props} />,
    pre: ({ node: _node, ...props }) => (
      <pre className="my-2 max-h-80 overflow-auto rounded-md border border-border bg-editor px-3 py-2 font-mono text-xs leading-[18px] [&>code]:bg-transparent [&>code]:p-0" {...props} />
    ),
    code: ({ node: _node, className, ...props }) => <code className={cn("rounded-sm bg-muted px-1 py-px font-mono text-[12px]", className)} {...props} />,
  };
}

const COMPONENTS: Record<Variant, Components> = { chat: makeComponents("chat"), document: makeComponents("document") };

type MarkdownProps = VariantProps<typeof markdownVariants> & { children: string; className?: string };

function Markdown({ children, variant, className }: MarkdownProps) {
  return (
    <div data-slot="markdown" data-variant={variant ?? "chat"} className={cn(markdownVariants({ variant }), className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS[variant ?? "chat"]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

const MemoMarkdown = React.memo(Markdown);

export { MemoMarkdown as Markdown, markdownVariants, type MarkdownProps };
