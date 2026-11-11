const limit = 30;
const gapMs = 2000;

export function pushUndo(history, state, label, { now, type } = {}) {
  if (!history || !Object.hasOwn(history, "present")) return { past: [], present: state, future: [] };
  if (history.present === state) return history;
  const clean = typeof label === "string" && label.trim() ? label.trim() : "editar lista";
  const action = { label: clean, type: type ?? clean.split(/\s+/u, 1)[0], at: now };
  const previous = history.past.at(-1);
  const elapsed = now - previous?.at;
  const combine = history.future.length === 0 && previous?.type === action.type && elapsed >= 0 && elapsed < gapMs;
  const past = combine
    ? [...history.past.slice(0, -1), { ...action, state: previous.state }]
    : [...history.past, { ...action, state: history.present }].slice(-limit);
  return { past, present: state, future: [] };
}

export function undo(history) {
  const last = history?.past.at(-1);
  if (!last) return history;
  return { past: history.past.slice(0, -1), present: last.state,
    future: [{ ...last, state: history.present }, ...history.future] };
}

export function redo(history) {
  const next = history?.future[0];
  if (!next) return history;
  return { past: [...history.past, { ...next, state: history.present }], present: next.state,
    future: history.future.slice(1) };
}

export function describeUndo(history) {
  const last = history?.past.at(-1);
  return last ? "Desfazer: " + last.label : "";
}
