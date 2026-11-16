import { create } from 'zustand';

const STORAGE_KEY = 'focusflight-weekly-goals-v2';
export const validWeeklyGoal = (minutes: number) => Number.isInteger(minutes) && minutes >= 30 && minutes <= 10_080 && minutes % 30 === 0;
export interface CloudGoal { goal_minutes: number | null; revision: string }
export interface GoalTransport {
  read: () => Promise<CloudGoal | null>;
  write: (minutes: number | null, expected: string | null) => Promise<CloudGoal & { applied: boolean }>;
}
interface PendingGoal { minutes: number | null; baseRevision: string | null; mutation: string }
type SyncStatus = 'loading' | 'syncing' | 'synced' | 'pending' | 'error' | 'conflict';
interface StoredGoals {
  goals: Record<string, number>;
  pending: Record<string, PendingGoal>;
  revisions: Record<string, string | null>;
}
const empty = (): StoredGoals => ({ goals: {}, pending: {}, revisions: {} });
function readStored(): StoredGoals {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const value = JSON.parse(raw ?? '{}');
    const legacy = raw === null ? JSON.parse(localStorage.getItem('focusflight-weekly-goals-v1') ?? '{}') : value.goals;
    const valid = legacy && typeof legacy === 'object' && !Array.isArray(legacy) ? legacy : {};
    const result = empty();
    result.goals = Object.fromEntries(Object.entries(valid).filter(([, minutes]) => typeof minutes === 'number' && validWeeklyGoal(minutes))) as Record<string, number>;
    for (const [owner, pending] of Object.entries(value.pending ?? {})) {
      const item = pending as PendingGoal;
      if (owner !== 'guest' && item && (item.minutes === null || validWeeklyGoal(item.minutes)) && typeof item.mutation === 'string' && (item.baseRevision === null || typeof item.baseRevision === 'string')) result.pending[owner] = item;
    }
    result.revisions = Object.fromEntries(Object.entries(value.revisions ?? {}).filter(([, revision]) => revision === null || typeof revision === 'string')) as Record<string, string | null>;
    return result;
  } catch { return empty(); }
}
function persist(state: StoredGoals) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ goals: state.goals, pending: state.pending, revisions: state.revisions })); return true; }
  catch { return false; }
}
interface GoalState extends StoredGoals {
  status: Record<string, SyncStatus>;
  save: (owner: string, minutes: number | null) => boolean;
  sync: (owner: string, transport: GoalTransport, stillCurrent: () => boolean) => Promise<void>;
}
const inFlight = new Map<string, Promise<void>>();
export const useWeeklyGoalStore = create<GoalState>((set, get) => ({
  ...readStored(), status: {},
  save: (owner, minutes) => {
    if (minutes !== null && !validWeeklyGoal(minutes)) return false;
    const goals = { ...get().goals };
    if (minutes === null) delete goals[owner]; else goals[owner] = minutes;
    const pending = { ...get().pending };
    if (owner !== 'guest') pending[owner] = { minutes, baseRevision: get().revisions[owner] ?? null, mutation: crypto.randomUUID() };
    const next = { goals, pending, revisions: get().revisions };
    if (!persist(next)) return false;
    set({ ...next, status: { ...get().status, [owner]: owner === 'guest' ? 'synced' : 'pending' } });
    return true;
  },
  sync: (owner, transport, stillCurrent) => {
    if (owner === 'guest' || !stillCurrent()) return Promise.resolve();
    const running = inFlight.get(owner);
    if (running) return running;
    const run = (async () => {
      try {
        set({ status: { ...get().status, [owner]: get().pending[owner] ? 'syncing' : 'loading' } });
        const remote = await transport.read();
        if (!stillCurrent()) return;
        // A server record, including null, wins over legacy unversioned device goals.
        // Only migrate a legacy account goal when no server row exists.
        if (!get().pending[owner]) {
          if (!remote && get().goals[owner]) {
            const pending = { ...get().pending, [owner]: { minutes: get().goals[owner], baseRevision: null, mutation: crypto.randomUUID() } };
            set({ pending }); persist(get());
          } else {
            const goals = { ...get().goals };
            if (remote?.goal_minutes) goals[owner] = remote.goal_minutes; else delete goals[owner];
            set({ goals, revisions: { ...get().revisions, [owner]: remote?.revision ?? null }, status: { ...get().status, [owner]: 'synced' } });
            persist(get()); return;
          }
        }
        while (get().pending[owner] && stillCurrent()) {
          const pending = get().pending[owner];
          const result = await transport.write(pending.minutes, pending.baseRevision);
          if (!stillCurrent()) return;
          const current = get().pending[owner];
          const queue = { ...get().pending };
          const goals = { ...get().goals };
          const newerEdit = current && current.mutation !== pending.mutation;
          const accepted = result.applied || (!newerEdit && result.goal_minutes === pending.minutes);
          if (result.applied && newerEdit) {
            queue[owner] = { ...current, baseRevision: result.revision };
          } else {
            delete queue[owner];
            if (result.goal_minutes) goals[owner] = result.goal_minutes; else delete goals[owner];
          }
          set({ goals, pending: queue, revisions: { ...get().revisions, [owner]: result.revision }, status: { ...get().status, [owner]: accepted ? newerEdit ? 'syncing' : 'synced' : 'conflict' } });
          persist(get());
          if (!accepted) return;
        }
      } catch {
        if (stillCurrent()) set({ status: { ...get().status, [owner]: 'error' } });
      }
    })().finally(() => { inFlight.delete(owner); });
    inFlight.set(owner, run);
    return run;
  },
}));
