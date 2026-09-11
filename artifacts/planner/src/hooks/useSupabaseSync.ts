import { supabase } from "@/lib/supabase";

// ─── Offline write queue (same pattern as useRivalry.ts) ───────────────────
const QUEUE_KEY = "sb_offline_queue";
const DELETES_KEY = "sb_offline_deletes";

interface QueuedWrite { id: string; table: string; data: Record<string, unknown> }
interface QueuedDelete { id: string; table: string }

function loadQueue(): QueuedWrite[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]"); }
  catch { return []; }
}
function saveQueue(q: QueuedWrite[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}
function loadDeletes(): QueuedDelete[] {
  try { return JSON.parse(localStorage.getItem(DELETES_KEY) ?? "[]"); }
  catch { return []; }
}
function saveDeletes(q: QueuedDelete[]) {
  localStorage.setItem(DELETES_KEY, JSON.stringify(q));
}

export function enqueueWrite(item: QueuedWrite) {
  const q = loadQueue().filter((i) => i.id !== item.id);
  saveQueue([...q, item]);
}
export function enqueueDelete(table: string, rowId: string) {
  const key = `${table}_${rowId}`;
  saveDeletes([...loadDeletes().filter((i) => i.id !== key), { id: key, table }]);
}
export function isDeleteQueued(table: string, rowId: string): boolean {
  return loadDeletes().some((i) => i.id === `${table}_${rowId}`);
}

/** Fire-and-forget upsert; falls back to the offline queue when it fails. */
export async function syncUpsert(table: string, rowId: string, data: Record<string, unknown>) {
  const { error } = await supabase.from(table as never).upsert(data as never);
  if (error) enqueueWrite({ id: `${table}_${rowId}`, table, data });
}

/** Fire-and-forget delete; falls back to the offline delete queue when it fails. */
export async function syncDelete(table: string, rowId: string) {
  const { error } = await supabase.from(table as never).delete().eq("id", rowId);
  if (error) enqueueDelete(table, rowId);
}

/** Flush queued upserts and deletes; returns true if anything was flushed. */
export async function flushOfflineWrites(): Promise<boolean> {
  let flushed = false;

  const deletes = loadDeletes();
  if (deletes.length) {
    const byTable = new Map<string, string[]>();
    for (const item of deletes) {
      const rowId = item.id.slice(item.table.length + 1);
      byTable.set(item.table, [...(byTable.get(item.table) ?? []), rowId]);
    }
    const succeeded: string[] = [];
    for (const [table, ids] of byTable) {
      const { error } = await supabase.from(table as never).delete().in("id", ids);
      if (!error) {
        flushed = true;
        for (const id of ids) succeeded.push(`${table}_${id}`);
      }
    }
    saveDeletes(loadDeletes().filter((i) => !succeeded.includes(i.id)));
  }

  const q = loadQueue();
  if (q.length) {
    const succeeded: string[] = [];
    for (const item of q) {
      const { error } = await supabase.from(item.table as never).upsert(item.data as never);
      if (!error) {
        flushed = true;
        succeeded.push(item.id);
      }
    }
    saveQueue(loadQueue().filter((i) => !succeeded.includes(i.id)));
  }

  return flushed;
}

/** Re-apply queued writes and deletes on top of freshly fetched server rows. */
export function applyPendingWrites<T extends { id: string }>(
  table: string,
  remoteRows: Record<string, unknown>[],
  fromRow: (row: Record<string, unknown>) => T,
): T[] {
  const pendingDeletes = new Set(
    loadDeletes().filter((i) => i.table === table).map((i) => i.id.slice(i.table.length + 1)),
  );
  const pendingWrites = loadQueue()
    .filter((i) => i.table === table)
    .map((i) => fromRow(i.data));

  const byId = new Map<string, T>();
  for (const row of remoteRows) {
    const item = fromRow(row);
    if (!pendingDeletes.has(item.id)) byId.set(item.id, item);
  }
  for (const item of pendingWrites) {
    if (!pendingDeletes.has(item.id)) byId.set(item.id, item);
  }
  return [...byId.values()];
}

/** Push local-only items (pre-sync data or offline adds) up to Supabase. */
export function pushLocalOnly<T extends { id: string }>(table: string, items: T[], toRow: (item: T) => Record<string, unknown>) {
  for (const item of items) syncUpsert(table, item.id, toRow(item));
}
