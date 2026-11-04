// Run after exact question-review validation, and only for new source proposals.
// Personal questions and frozen templates are never rewritten.
export function sourceQuestionSubject(text, subject = '') {
  const value = subject.trim() || '[onderwerp]';
  return text.replaceAll('{{onderwerp}}', () => value);
}
