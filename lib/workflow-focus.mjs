// Navigation must not take focus back from a dialog opened in the same frame.
export function focusWorkflowHeading(document) {
  const dialogs = document.querySelectorAll('dialog[open], [role="dialog"], [role="alertdialog"]');
  if (Array.from(dialogs).some(node => !node.hidden && node.getClientRects().length)) return;
  document.getElementById('workflow-page-title')?.focus({preventScroll:true});
}
