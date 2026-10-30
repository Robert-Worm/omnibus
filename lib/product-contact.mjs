import { PRODUCT_TITLE } from './product-release.mjs';

// Een mailto-koppeling opent alleen iets wanneer er op die computer een
// e-mailprogramma aan het mailto-schema is gekoppeld. Is dat niet zo — en bij
// webmail is dat vaak niet zo — dan gebeurt er bij een klik stil niets: geen
// melding, geen venster. Daarom staat alles wat de lezer nodig heeft ook als
// tekst op het scherm, en is de mailto nog slechts een snelkoppeling.
export const contactAddress = 'info@rijksmap.nl';

/** De openbare repository; wie de site vindt, moet ook de code kunnen vinden. */
export const repositoryUrl = 'https://github.com/Robert-Worm/omnibus';

/** Wat een melding bruikbaar maakt; op het scherm zichtbaar, niet alleen in de mailto verstopt. */
export const reportFields = [
  'Pagina of stap',
  'Wat deed ik',
  'Wat verwachtte ik',
  'Wat gebeurde er',
  'Bron of norm-ID (indien relevant)',
  'Browser',
];

export const confidentialityNote =
  'Deel geen vertrouwelijke onderzoeksgegevens of projectbestanden.';

export const contactSubject = PRODUCT_TITLE;
export const reportSubject = `${PRODUCT_TITLE}: fout of verbetervoorstel`;

export const reportBody = `${reportFields.map((field) => `${field}:`).join('\n\n')}\n\n${confidentialityNote}`;

/** Het hele bericht als platte tekst, te plakken in webmail dat geen mailto aanneemt. */
export const reportMessage = `Aan: ${contactAddress}\nOnderwerp: ${reportSubject}\n\n${reportBody}`;

/**
 * @param {string} subject
 * @param {string} [body]
 * @returns {string}
 */
export function mailtoLink(subject, body) {
  const query = `subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ''}`;
  return `mailto:${contactAddress}?${query}`;
}

export const contactMailto = mailtoLink(contactSubject);
export const reportMailto = mailtoLink(reportSubject, reportBody);

// Wie geen mailprogramma heeft, heeft bijna altijd webmail. Deze koppelingen
// openen daar een concept met adres, onderwerp en sjabloon al ingevuld; het
// verzenden blijft aan de lezer. Er gaat niets uit Omnibus mee: de tekst is
// hetzelfde vaste sjabloon dat ook op het klembord belandt.

/** @param {string} subject @param {string} [body] @returns {string} */
export function gmailCompose(subject, body) {
  const query = new URLSearchParams({ view: 'cm', fs: '1', to: contactAddress, su: subject });
  if (body) query.set('body', body);
  return `https://mail.google.com/mail/?${query}`;
}

/** @param {string} subject @param {string} [body] @returns {string} */
export function outlookCompose(subject, body) {
  const query = new URLSearchParams({ to: contactAddress, subject });
  if (body) query.set('body', body);
  return `https://outlook.office.com/mail/deeplink/compose?${query}`;
}

/** De twee wegen naar buiten, per contactregel. */
export const contactRoutes = {
  adres: {
    mailto: contactMailto,
    gmail: gmailCompose(contactSubject),
    outlook: outlookCompose(contactSubject),
    clipboard: contactAddress,
    copyLabel: 'Kopieer adres',
  },
  melding: {
    mailto: reportMailto,
    gmail: gmailCompose(reportSubject, reportBody),
    outlook: outlookCompose(reportSubject, reportBody),
    clipboard: reportMessage,
    copyLabel: 'Kopieer melding',
  },
};
