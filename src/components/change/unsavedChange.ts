/** Whether what is being edited differs from what was saved; both are plain records, so their JSON tells. */
export function hasUnsavedChange(edited: unknown, saved: unknown): boolean {
  return JSON.stringify(edited) !== JSON.stringify(saved);
}
