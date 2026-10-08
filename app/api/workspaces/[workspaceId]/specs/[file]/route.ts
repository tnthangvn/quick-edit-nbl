import { approveSpecRoute, deleteSpecRoute, getSpecRoute, renameSpecRoute } from "@/containers/Studio/Spec/UI/API/Routes/specs.route";

export const GET = getSpecRoute.handler;
export const PUT = approveSpecRoute.handler;
export const PATCH = renameSpecRoute.handler;
export const DELETE = deleteSpecRoute.handler;
