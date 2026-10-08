import "server-only";
import { isGoogleConfigured, isGoogleConnected } from "@/ship/adapters/google";
import { Task } from "@/ship/parents/Task";
import { googleSecretRefs } from "../Models/googleSecret";

/** configured: có GOOGLE_CLIENT_ID/SECRET; connected: đã có refresh token (của Workspace hoặc dùng chung). */
export class GetGoogleOAuthStatusTask extends Task<{ workspaceId?: string }, { configured: boolean; connected: boolean }> {
  async run({ workspaceId }: { workspaceId?: string }): Promise<{ configured: boolean; connected: boolean }> {
    return { configured: isGoogleConfigured(), connected: await isGoogleConnected(googleSecretRefs(workspaceId)) };
  }
}
