import {useState} from 'react';
import {databaseSourcesEnabled} from '@/lib/application-mode.mjs';
import Glossary from './glossary';
import {PRODUCT_TITLE, PRODUCT_VERSION} from '@/lib/product-release.mjs';
import {contactAddress, contactRoutes} from '@/lib/product-contact.mjs';
import {copyText} from '@/lib/copy-text.mjs';
import {openMailto} from '@/lib/mail-handoff.mjs';
import {Popover, PopoverTrigger, PopoverContent, PopoverDescription} from '@/components/ui/popover';
import {ArrowUpRight, BookOpen, Check, ChevronDown, ClipboardList, Compass, Copy, Download, FileText, Globe, Info, Layers, LockKeyhole, Mail, Target, UserRound, MessageSquareWarning, X} from 'lucide-react';

// Een mailto-koppeling opent niets wanneer er geen e-mailprogramma aan het
// mailto-schema is gekoppeld; de klik doet dan stil niets. Er is geen manier om
// dat vooraf te vragen, dus wordt het geprobeerd: blijft het venster de aandacht
// houden, dan is er niets gebeurd en komt de keuzehulp met webmail en klembord.
function ContactRow({rowKey, icon, label, copied, onCopied, open, onOpen}: {
  rowKey: string; icon: React.ReactNode; label: string; copied: string;
  onCopied: (value: string) => void; open: string; onOpen: (value: string) => void;
}) {
  const route = contactRoutes[rowKey as keyof typeof contactRoutes];
  const done = copied === rowKey;
  return <Popover open={open === rowKey} onOpenChange={(next: boolean) => {
    // Openen gebeurt niet op de klik zelf: eerst het mailprogramma, en alleen
    // wanneer dat niets deed neemt deze hulp het over.
    if (!next) { onOpen(''); return; }
    onCopied('');
    void openMailto(route.mailto).then((opened) => { if (!opened) onOpen(rowKey); });
  }}>
    <PopoverTrigger render={<button type="button" className="footer-contact-item" aria-label={label}/>}>
      {icon}<span>{label}</span>
    </PopoverTrigger>
    <PopoverContent className="footer-mail-choice" align="start" aria-label={`Andere manieren: ${label}`}>
      <button type="button" className="footer-mail-choice-close" aria-label="Sluiten" onClick={() => onOpen('')}>
        <X aria-hidden="true"/>
      </button>
      <PopoverDescription>
        Er lijkt geen mailprogramma ingesteld. Open het bericht in webmail of kopieer het.
      </PopoverDescription>
      <div className="footer-mail-choice-actions">
        <a className="footer-mail-choice-primary" href={route.gmail} target="_blank" rel="noopener noreferrer">Openen in Gmail</a>
        <a href={route.outlook} target="_blank" rel="noopener noreferrer">Openen in Outlook</a>
        <button type="button" onClick={() => {
          void copyText(route.clipboard).then((ok) => { onCopied(ok ? rowKey : 'mislukt'); onOpen(''); });
        }}>{done ? <Check aria-hidden="true"/> : <Copy aria-hidden="true"/>}{route.copyLabel}</button>
      </div>
      <p className="footer-mail-choice-note">Gmail en Outlook openen in een nieuw tabblad een concept dat u zelf verstuurt.</p>
    </PopoverContent>
  </Popover>;
}

function ContactActions() {
  const [copied, setCopied] = useState('');
  const [open, setOpen] = useState('');
  const shared = {copied, onCopied: setCopied, open, onOpen: setOpen};
  return <div className="footer-contact">
    <ContactRow rowKey="adres" icon={<Mail aria-hidden="true"/>} label={contactAddress} {...shared}/>
    <ContactRow rowKey="melding" icon={<MessageSquareWarning aria-hidden="true"/>} label="Fout of verbetering melden" {...shared}/>
    <output className="footer-contact-status" data-status-block="">
      {copied === 'adres' && 'Het adres staat op je klembord.'}
      {copied === 'melding' && 'De melding staat op je klembord, met adres, onderwerp en de punten om in te vullen. Plak hem in een nieuwe e-mail.'}
      {copied === 'mislukt' && `Kopiëren lukt niet in deze browser. Mail zelf naar ${contactAddress}.`}
    </output>
    <p className="footer-contact-note">Vermeld de stap en wat je verwachtte. Stuur geen vertrouwelijke onderzoeksgegevens mee.</p>
  </div>;
}

export default function ProductFooter() {
  return <footer className="product-footer" aria-label="Over Omnibus en contact">
    <div className="product-footer-grid">
      <section className="product-footer-brand" aria-label={PRODUCT_TITLE}>
        <a className="product-footer-wordmark" href="#begin">Project Omnibus</a>
        <p>Begin bij een onderzoeksbehoefte of verken je onderwerp. Kies toetspunten en modelvragen, verbind ze aan je onderzoeksvragen en exporteer je referentiekader.</p>
        <p className="product-footer-attribution">Een onafhankelijk, niet-commercieel initiatief van <strong>Robert Worm</strong>. Geen officiële uiting van de rijksoverheid of van de uitgevers van de gebruikte kaders.</p>
        <span className="product-footer-version">Versie {PRODUCT_VERSION} · Onderdeel van Rijksmap</span>
      </section>
      <nav className="product-footer-column" aria-label="Bronnen verkennen">
        <h2>Bronnen</h2>
        <a href="#grondslagen"><BookOpen aria-hidden="true"/>Wetten en kaders</a>
        <a href="#modellen"><Compass aria-hidden="true"/>Onderzoeksmodellen</a>
        <a href="#themas"><Layers aria-hidden="true"/>Thema’s &amp; processen</a>
        <a href="#rapporten"><FileText aria-hidden="true"/>Rapportbibliotheek</a>
        <a href="https://www.rijksmap.nl/" target="_blank" rel="noopener noreferrer"><Globe aria-hidden="true"/><span>Ontdek Rijksmap <ArrowUpRight className="footer-external" aria-hidden="true"/></span></a>
      </nav>
      <nav className="product-footer-column" aria-label="Je onderzoek">
        <h2>Je onderzoek</h2>
        <a href="#begin"><Compass aria-hidden="true"/>Kies je onderzoeksroute</a>
        <a href="#start"><Target aria-hidden="true"/>Start vanuit een behoefte</a>
        <a href="#risicoverkenning"><MessageSquareWarning aria-hidden="true"/>Start vanuit signalen en zorgen</a>
        <a href="#mijn-kader"><ClipboardList aria-hidden="true"/>Bouw je kader</a>
        <a href="#kaderexport"><Download aria-hidden="true"/>Exporteer je onderzoek</a>
      </nav>
      <section className="product-footer-column" aria-label="Over en contact">
        <h2>Over Omnibus</h2>
        <Glossary />
      <details><summary><Info aria-hidden="true"/>Gebruik en bronnen<ChevronDown className="footer-disclosure" aria-hidden="true"/></summary>
        <p>Omnibus helpt bij het voorbereiden van onderzoek; het geeft geen auditoordeel of juridisch advies. Met AI ondersteunde bewerkingen kunnen fouten bevatten. Controleer de oorspronkelijke bron, toepasselijkheid, reikwijdte en actualiteit voordat u normen gebruikt. De auditor bepaalt de onderzoeksaanpak en trekt de conclusies.</p>
        <p>De rechten en gebruiksvoorwaarden van de oorspronkelijke bronnen blijven gelden. Een verwijzing of eigen bewerking maakt de bron niet vrij beschikbaar.</p>
      </details>
      <details><summary><LockKeyhole aria-hidden="true"/>Lokale opslag en privacy<ChevronDown className="footer-disclosure" aria-hidden="true"/></summary>
        <p>Deze lokale versie bewaart uw project in deze browser en uploadt het niet automatisch. Bewaar ook een projectbestand: browseropslag kan verdwijnen of vol raken. Deel geen vertrouwelijke onderzoeksgegevens bij een foutmelding. Bij het openen van externe links gelden de voorwaarden van die website.</p>
        <p>Bij openen en aanpassen aan een nieuwe indeling kunnen herstelkopieën in deze browser achterblijven, naast oude projectgegevens en weergavevoorkeuren. Nieuw project maakt het actieve project leeg, maar verwijdert herstelkopieën en oude projectgegevens niet. Wilt u alle lokale gegevens verwijderen? Bewaar eerst de benodigde bestanden, sluit alle tabbladen van Omnibus en verwijder de sitegegevens voor dit website-adres via de browserinstellingen. Gedownloade project- en herstelbestanden blijven op uw computer staan; verwijder die zo nodig apart.</p>
        {databaseSourcesEnabled&&<p>In deze databaseproef worden de catalogus, normen, modelgegevens en bronpagina’s opgehaald bij de lokale brondienst zodra ze nodig zijn. Alleen de benodigde pakketversies en paginanummers worden aangevraagd; uw vragen, notities en projectbestand worden niet meegestuurd. Dit is nog geen online productieomgeving.</p>}
      </details>
      <details className="footer-about-contact"><summary><UserRound aria-hidden="true"/>Over &amp; contact<ChevronDown className="footer-disclosure" aria-hidden="true"/></summary>
        <p>Project Omnibus is een persoonlijk, niet-commercieel initiatief van <strong>Robert Worm</strong>, de maker van Rijksmap.</p>
        <p>Het doel: auditors helpen om vanuit een onderzoeksbehoefte of signalen bruikbare normen en interviewvragen te kiezen, met zicht op de oorspronkelijke bronnen.</p>
        <a className="footer-contact-item" href="https://www.linkedin.com/in/robertworm/" target="_blank" rel="noopener noreferrer"><UserRound aria-hidden="true"/><span>Robert Worm op LinkedIn</span><ArrowUpRight aria-hidden="true"/></a>
        <ContactActions/>
      </details>
      </section>
    </div>
  </footer>;
}
