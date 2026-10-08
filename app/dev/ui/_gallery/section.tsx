import * as React from "react";

/** Khung một mục trong gallery (chỉ dùng ở /dev/ui). */
export function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-16 flex-col gap-4 rounded-lg border border-border bg-card p-5">
      <h2 id={`${id}-title`} className="m-0 text-sm leading-5 font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Row({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {label ? <span className="text-[11px] leading-4 font-semibold tracking-[.06em] text-muted-foreground uppercase">{label}</span> : null}
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
