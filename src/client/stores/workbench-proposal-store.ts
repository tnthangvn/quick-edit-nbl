"use client";

import { create } from "zustand";
import type { SpecProposedEventOutput } from "@/client/api/generated/model";

/**
 * Hàng đợi đề xuất sửa spec của Agent (spec 3.3, 6.1). Nguồn: event SSE `SPEC_PROPOSED` (chat tool hoặc CLI run),
 * dự phòng từ tool part `propose_spec_update` của useChat khi lỡ SSE. Đề xuất đầu hàng là đề xuất đang duyệt (DiffView).
 * `handled` nhớ khoá đã Approve / Reject để nguồn dự phòng không đưa lại.
 */
export type Proposal = Pick<SpecProposedEventOutput, "workspaceId" | "file" | "original" | "proposed" | "sourceId"> & {
  key: string;
  receivedAt: number;
};

export type ProposalState = { queue: Proposal[]; handled: string[] };

type ProposalActions = {
  enqueue: (proposal: Omit<Proposal, "key" | "receivedAt">) => void;
  /** Approve xong / Reject: bỏ khỏi hàng đợi, nhớ là đã xử lý. */
  resolve: (key: string) => void;
  /** Đưa một đề xuất lên đầu hàng (người dùng chọn duyệt nó trước). */
  focus: (key: string) => void;
};

const MAX_HANDLED = 200;

export const proposalKey = (p: Pick<Proposal, "sourceId" | "file">) => `${p.sourceId}\u0000${p.file}`;

export function enqueueProposal(state: ProposalState, input: Omit<Proposal, "key" | "receivedAt">, now = Date.now()): ProposalState {
  const key = proposalKey(input);
  if (state.handled.includes(key)) return state;
  const proposal: Proposal = { ...input, key, receivedAt: now };
  const index = state.queue.findIndex((p) => p.key === key);
  if (index >= 0) {
    // Cùng nguồn (SSE và dự phòng): giữ vị trí, ưu tiên bản có `original` (SSE đọc từ đĩa).
    const queue = [...state.queue];
    queue[index] = { ...proposal, receivedAt: queue[index].receivedAt, original: input.original || queue[index].original };
    return { ...state, queue };
  }
  return { ...state, queue: [...state.queue, proposal] };
}

export function resolveProposal(state: ProposalState, key: string): ProposalState {
  return {
    queue: state.queue.filter((p) => p.key !== key),
    handled: [...state.handled.filter((k) => k !== key), key].slice(-MAX_HANDLED),
  };
}

export function focusProposal(state: ProposalState, key: string): ProposalState {
  const target = state.queue.find((p) => p.key === key);
  if (!target) return state;
  return { ...state, queue: [target, ...state.queue.filter((p) => p.key !== key)] };
}

export const useProposalStore = create<ProposalState & ProposalActions>()((set) => ({
  queue: [],
  handled: [],
  enqueue: (proposal) => set((s) => enqueueProposal(s, proposal)),
  resolve: (key) => set((s) => resolveProposal(s, key)),
  focus: (key) => set((s) => focusProposal(s, key)),
}));

/** Đề xuất đang duyệt của Workspace (đầu hàng) + tổng số đang chờ. */
export function useActiveProposal(workspaceId: string) {
  const active = useProposalStore((s) => s.queue.find((p) => p.workspaceId === workspaceId) ?? null);
  const pending = useProposalStore((s) => s.queue.filter((p) => p.workspaceId === workspaceId).length);
  return { active, pending };
}
