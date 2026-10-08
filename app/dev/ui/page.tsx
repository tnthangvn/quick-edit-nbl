import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gallery } from "./_gallery/gallery";

export const metadata: Metadata = { title: "UI Gallery · Spec Studio" };

/** Trang review UI base (chỉ có ở dev): mọi primitive / molecule / organism / template ở mọi biến thể. */
export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Gallery />;
}
