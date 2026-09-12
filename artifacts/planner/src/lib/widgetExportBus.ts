// Widget export bus: any data-writing hook can call requestWidgetExport()
// after a mutation, and all calls within the debounce window coalesce into a
// single export_data_for_widgets invocation.

let timer: NodeJS.Timeout | null = null;
let dirty = false;

export function requestWidgetExport() {
  if (typeof window === "undefined" || !((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__)) return;
  dirty = true;
  if (timer) return;
  timer = setTimeout(flush, 500);
}

async function exportData() {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const goalsKey = Object.keys(localStorage).find(k => k.startsWith('planner_goals_')) || 'planner_goals_anon';
    const eventsKey = Object.keys(localStorage).find(k => k.startsWith('planner_events_')) || 'planner_events_anon';
    const rivalryKey = Object.keys(localStorage).find(k => k.startsWith('rivalry_profile_')) || 'rivalry_profile_anon';
    const diaryKey = Object.keys(localStorage).find(k => k.startsWith('task_battles_diary_')) || 'task_battles_diary_anon';
    const goalsJson = localStorage.getItem(goalsKey) || '[]';
    const eventsJson = localStorage.getItem(eventsKey) || '[]';
    const rivalryJson = localStorage.getItem(rivalryKey) || '{}';
    const diaryJson = localStorage.getItem(diaryKey) || '{}';
    const configJson = localStorage.getItem('tb_widget_config') || '{"widgets":[]}';
    await invoke("export_data_for_widgets", { goalsJson, eventsJson, configJson, rivalryJson, diaryJson });
    console.log("[Widget] Data exported successfully");
  } catch (e) {
    console.error("[Widget] Export failed:", e);
  }
}

async function flush() {
  timer = null;
  if (!dirty) return;
  dirty = false;
  await exportData();
}
