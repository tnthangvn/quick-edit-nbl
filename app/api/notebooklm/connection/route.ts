import {
  deleteNotebookConnectionRoute,
  getNotebookConnectionRoute,
  saveNotebookConnectionRoute,
} from "@/containers/Studio/Notebook/UI/API/Routes/notebookConnection.route";

export const GET = getNotebookConnectionRoute.handler;
export const PUT = saveNotebookConnectionRoute.handler;
export const DELETE = deleteNotebookConnectionRoute.handler;
