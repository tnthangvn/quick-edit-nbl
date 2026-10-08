import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { StartGoogleOAuthAction } from "../../../Actions/StartGoogleOAuthAction";
import type { startGoogleOAuthContract } from "../Requests/StorageRequests";

type C = typeof startGoogleOAuthContract;

/** Trả URL đồng ý của Google; FE mở URL (cửa sổ mới), Google chuyển về /api/google/oauth/callback cùng origin. */
export class StartGoogleOAuthController implements ContractController<C> {
  async handle({ query, request }: ContractInput<C>): Promise<ContractOutput<C>> {
    const redirectUri = new URL("/api/google/oauth/callback", request.url).toString();
    return { status: 200, body: await new StartGoogleOAuthAction().run({ redirectUri, workspaceId: query.workspaceId }) };
  }
}
