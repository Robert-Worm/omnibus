// Keep the reset checkpoint and a bounded chronological history of subsequent actions.
export function recordRecovery(history, draft, label, coalesce = false) {
  if (coalesce && history.length) return history;
  const next = [...history, {draft, label}];
  return next.length <= 100 ? next : [next[0], {...next[1], label:"Eerdere wijzigingen"}, ...next.slice(-98)];
}
