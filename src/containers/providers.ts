import "server-only";
import type { AgentSettingsAccess, SpecAccess } from "@/ship/contracts/studioAccess";
import { AgentSettingsProvider } from "./Studio/Setting/Providers/AgentSettingsProvider";
import { SpecAccessProvider } from "./Studio/Spec/Providers/SpecAccessProvider";

/**
 * Composition root cho giao tiếp khác Section. Section Agent chỉ import file này (không import Studio trực tiếp).
 */
export const studio: { specs: () => SpecAccess; agentSettings: () => AgentSettingsAccess } = {
  specs: () => new SpecAccessProvider(),
  agentSettings: () => new AgentSettingsProvider(),
};
