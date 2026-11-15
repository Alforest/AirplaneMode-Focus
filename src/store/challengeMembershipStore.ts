import { create } from 'zustand';

// Reuse the leaderboard's membership response; no second request or persisted cache.
// Enrollment is permanent, so a late pre-join response cannot undo a successful join.
export const useChallengeMembership = create<{
  members: Record<string, boolean>;
  update: (owner: string, joined: boolean) => void;
}>(set => ({
  members: {},
  update: (owner, joined) => set(state => ({
    members: { ...state.members, [owner]: state.members[owner] === true || joined },
  })),
}));
