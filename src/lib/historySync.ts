import { supabase } from './supabase';
import { useAuthStore } from '../store/authStore';
import { HistoryRecord, useHistoryStore } from '../store/historyStore';
import type { CompletedFlight } from '../types/history';

let inFlight: Promise<void> | null = null;
let requested = false;

export function syncHistory(): Promise<void> {
  requested = true;
  if (inFlight) return inFlight;
  inFlight = run().finally(() => { inFlight = null; });
  return inFlight;
}

async function run() {
  while (requested) {
    requested = false;
    const client = supabase;
    const owner = useAuthStore.getState().user?.id;
    if (!client || !owner) return;
    const stillCurrent = () => useAuthStore.getState().user?.id === owner;
    useAuthStore.setState({ syncStatus: 'syncing' });
    try {
      // Paginate: PostgREST's default response cap must not truncate large logs.
      const remote: HistoryRecord[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await client.from('flight_history')
          .select('id, flight, deleted').eq('user_id', owner)
          .order('id').range(offset, offset + 499);
        if (error) throw error;
        if (!stillCurrent()) break;
        remote.push(...(data ?? []).map(row => ({
          flight: row.flight as CompletedFlight, deleted: row.deleted,
          pending: false, revision: row.id,
        })));
        if (!data || data.length < 500) break;
      }
      if (!stillCurrent()) continue;
      useHistoryStore.getState().mergeCloud(owner, remote);
      const pending = Object.values(useHistoryStore.getState().buckets[owner] ?? {})
        .filter(record => record.pending);
      for (let offset = 0; offset < pending.length; offset += 100) {
        if (!stillCurrent()) break;
        const batch = pending.slice(offset, offset + 100);
        const { data, error } = await client.from('flight_history').upsert(batch.map(record => ({
          user_id: owner, id: record.flight.id, flight: record.flight, deleted: record.deleted,
        })), { onConflict: 'user_id,id' }).select('id, flight, deleted');
        if (error) throw error;
        useHistoryStore.getState().acknowledge(owner, batch);
        // The database may have retained a tombstone created concurrently elsewhere.
        useHistoryStore.getState().mergeCloud(owner, (data ?? []).map(row => ({
          flight: row.flight as CompletedFlight, deleted: row.deleted,
          pending: false, revision: row.id,
        })));
      }
      if (stillCurrent()) useAuthStore.setState({ syncStatus: 'synced' });
    } catch {
      if (stillCurrent()) useAuthStore.setState({ syncStatus: 'error' });
      // Keep pending records on disk. Online/focus events and the retry timer retry later.
    }
  }
}
