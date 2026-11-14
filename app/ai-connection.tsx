"use client";
import {useState} from 'react';
import {Bot, Copy} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog, DialogClose, DialogTrigger} from '@/components/ui/dialog';
import {ProjectUtilityContent} from './project-utilities';

// Only the local database build supplies a launch command. Hosted/offline builds
// must not pretend that they can connect to a process on the visitor's computer.
declare const __OMNIBUS_LOCAL_AGENT__: {command:string; server:string} | undefined;

export function AiConnection() {
  const setup = typeof __OMNIBUS_LOCAL_AGENT__ === 'undefined' ? undefined : __OMNIBUS_LOCAL_AGENT__;
  const [message, setMessage] = useState('');
  const config = setup ? `[mcp_servers.omnibus]\ncommand = ${JSON.stringify(setup.command)}\nargs = [${JSON.stringify(setup.server)}]\nstartup_timeout_sec = 30\ntool_timeout_sec = 120\ndefault_tools_approval_mode = "writes"` : '';
  async function copyConfig() {
    try { await navigator.clipboard.writeText(config); setMessage('Codex-instelling gekopieerd.'); }
    catch { setMessage('Kopiëren lukt hier niet. Selecteer en kopieer de instelling hieronder.'); }
  }
  return <Dialog>
    <DialogTrigger render={<Button variant="outline" className="ai-connection-trigger" aria-label="AI koppelen" title="AI koppelen"/>}><Bot size={18} aria-hidden="true"/>AI koppelen</DialogTrigger>
    <ProjectUtilityContent title="Je eigen AI koppelen" description="Verken bronnen en maak een onderzoeksproject met je eigen AI-app."
      icon={<Bot size={20}/>} closeLabel="AI-koppeling sluiten" className="ai-connection-dialog"
      footer={<><output>{message}</output><DialogClose render={<Button variant="ghost"/>}>Sluiten</DialogClose>{setup && <Button onClick={copyConfig}><Copy size={16} aria-hidden="true"/>Kopieer instelling</Button>}</>}>
      <ol className="share-project-steps">
        <li><div><strong>Koppel Omnibus in je AI-app</strong><p>{setup ? 'Voeg in Codex bij Instellingen → MCP-servers een lokale STDIO-server toe met de gegevens hieronder. Herstart de verbinding als deze al is toegevoegd.' : 'Deze versie biedt nog geen online AI-koppeling. De lokale databaseversie ondersteunt een verbinding met Codex via MCP.'}</p></div></li>
        <li><div><strong>Beschrijf je onderzoek</strong><p>Laat je AI bronnen lezen, toetspunten kiezen en vragen voorstellen. Deel alleen gegevens die je met je AI-aanbieder mag delen.</p></div></li>
        <li><div><strong>Beoordeel het concept</strong><p>Open het gemaakte project via <strong>Open project</strong>.</p></div></li>
      </ol>
      <p className="project-utility-hint">Alleen lezen: bronnen blijven ongewijzigd en je project wordt niet gedeeld.</p>
      {setup && <details className="share-link-explanation"><summary>Lokale verbindingsgegevens</summary>
        <p>Alleen voor Omnibus op deze computer. Deze pagina kan niet zien of je AI-app verbonden is; controleer dat in je AI-app.</p>
        <label className="ai-connection-config">Codex-instelling<textarea readOnly value={config} rows={7} spellCheck={false}/></label>
      </details>}
    </ProjectUtilityContent>
  </Dialog>;
}
