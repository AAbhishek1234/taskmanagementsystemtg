/** The sidebar tree listens for this so it refreshes after tasks / lists change anywhere in the app. */
export const HIERARCHY_CHANGED = "hierarchy:changed";

export function notifyHierarchyChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(HIERARCHY_CHANGED));
}

export const SPACE_COLORS = ["#2563eb", "#d27740", "#16a34a", "#9333ea", "#dc2626", "#0891b2", "#ca8a04"];
