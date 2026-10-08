"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { StorageType, WorkspaceSort } from "@/client/api/generated/model";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/ui/primitives/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/primitives/select";
import { Tabs, TabsList, TabsTrigger } from "@/ui/primitives/tabs";

/** Lọc theo nơi lưu: `ALL` hoặc một `StorageType`. */
export type StorageFilter = StorageType | "ALL";

export type ProjectToolbarProps = {
  q: string;
  onQChange: (q: string) => void;
  storage: StorageFilter;
  onStorageChange: (storage: StorageFilter) => void;
  sort: WorkspaceSort;
  onSortChange: (sort: WorkspaceSort) => void;
};

const FILTERS: StorageFilter[] = ["ALL", StorageType.LOCAL, StorageType.GIT, StorageType.DRIVE];

/** Thanh công cụ màn Projects (spec 3.0): ô tìm theo tên/đường dẫn, lọc nơi lưu (Tabs pill), sắp xếp. */
export function ProjectToolbar({ q, onQChange, storage, onStorageChange, sort, onSortChange }: ProjectToolbarProps) {
  const t = useTranslations("projects.toolbar");
  const searchId = React.useId();
  return (
    <>
      <InputGroup className="max-w-[360px] flex-1 basis-60">
        <InputGroupAddon>
          <Search aria-hidden />
        </InputGroupAddon>
        <label htmlFor={searchId} className="sr-only">
          {t("searchLabel")}
        </label>
        <InputGroupInput id={searchId} type="search" value={q} onChange={(e) => onQChange(e.target.value)} placeholder={t("searchPlaceholder")} />
      </InputGroup>
      <Tabs value={storage} onValueChange={(v) => onStorageChange(v as StorageFilter)}>
        <TabsList variant="pill" aria-label={t("filterLabel")}>
          {FILTERS.map((f) => (
            <TabsTrigger key={f} value={f}>
              {t(`filter.${f}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <span className="flex-1" />
      <Select value={sort} onValueChange={(v) => onSortChange(v as WorkspaceSort)}>
        <SelectTrigger size="sm" className="w-auto min-w-[180px]" aria-label={t("sortLabel")}>
          <span className="text-muted-foreground">{t("sortPrefix")}</span>
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {Object.values(WorkspaceSort).map((s) => (
            <SelectItem key={s} value={s}>
              {t(`sort.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
