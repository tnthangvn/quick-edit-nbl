import { createSpecRoute, listSpecsRoute } from "@/containers/Studio/Spec/UI/API/Routes/specs.route";

export const GET = listSpecsRoute.handler;
export const POST = createSpecRoute.handler;
