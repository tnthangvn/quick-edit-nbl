import type { RouteDefinition } from "@/ship/engine/defineRoute";
import { checkNotebookRoute } from "./checkNotebook.route";
import {
  checkNotebookConnectionRoute,
  deleteNotebookConnectionRoute,
  getNotebookConnectionRoute,
  saveNotebookConnectionRoute,
} from "./notebookConnection.route";

/** Mọi route của container Notebook. Thêm route mới vào mảng này để vào docs/api.json. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const routes: RouteDefinition<any, any>[] = [
  checkNotebookRoute,
  getNotebookConnectionRoute,
  saveNotebookConnectionRoute,
  deleteNotebookConnectionRoute,
  checkNotebookConnectionRoute,
];
