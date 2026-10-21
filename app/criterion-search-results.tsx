"use client";
import {Button} from '@/components/ui/button';
import {criterionIndex, searchCriteria} from '@/lib/criterion-search.mjs';
import {preparedFoundationItems, sourceScopeProvisions} from '@/lib/foundation-workspace.mjs';
import {foundations} from '@/lib/investigation.mjs';
// Building the search projection at module load delayed the first paint of the
// whole application. It is only needed once someone actually searches; the
// projection itself, and the criteria it points at, are unchanged.
let index:ReturnType<typeof criterionIndex>;
const searchIndex = () => index ?? (index = criterionIndex(preparedFoundationItems, foundations));
type SearchMatch={matchInCriterion:boolean;source:{id:string;title:string};item:{id:string;originKey:string;sourceId:string;title:string;auditNorm?:string;body?:string;groupTitle?:string;topic?:string;auditRole?:string;effectiveStatus?:string}};

export default function CriterionSearchResults({query,sourceIds,page,onPage,onOpen,disabled,selectedKeys,onChoose,matches:providedMatches,corrections=[],scopeProvisions=sourceScopeProvisions}:{
  query:string;sourceIds:string[];page:number;onPage:(page:number)=>void;
  onOpen:(sourceId:string,criterionId:string)=>void;disabled:boolean;
  selectedKeys:string[];onChoose:(originKey:string,include:boolean)=>void;
  matches?:SearchMatch[];corrections?:string[];
  scopeProvisions?:(sourceId:string)=>{count:number;titles:string[]};
}) {
  const matches:SearchMatch[] = providedMatches ?? (query.trim() ? searchCriteria(searchIndex(),query,sourceIds) : []);
  const last=Math.max(0,Math.ceil(matches.length/20)-1), current=Math.min(page,last);
  const rows=matches.slice(current*20,current*20+20);
  const groups=[...new Set(rows.map(r=>r.source.id))].map(id=>({id,rows:rows.filter(r=>r.source.id===id)}));
  return <section className="criterion-search-results" aria-label="Zoekresultaten normen">
    <h2>Gevonden in normen <small>({matches.length})</small></h2>
    {corrections.length>0 && <p className="creator-help">Geen exacte treffers. Vergelijkbare normen voor: {corrections.join(' / ')}. Controleer of dit is wat je bedoelt.</p>}
    <p className="creator-help">Zoekt ook in normen, groepsnamen en toepassingsvoorwaarden. Een treffer zegt niet of een verplichting op jouw organisatie van toepassing is.</p>
    {!matches.length && <p>Geen normen gevonden binnen deze zoekterm en filters. Probeer een ander woord of wis de filters.</p>}
    {groups.map(group=><section key={group.id} className="criterion-search-source">
      <h3>{group.rows[0].source.title}</h3>
      {scopeProvisions(group.id).count > 0 && <p className="source-scope-note">
        Afbakening ({scopeProvisions(group.id).count}) · {scopeProvisions(group.id).titles[0]}.
        Bepaal eerst of deze bron voor jouw organisatie geldt.
      </p>}
      {group.rows.map(({item,matchInCriterion})=><article key={item.originKey}>
        <div><small>{item.id} · {item.groupTitle || item.topic || 'Algemeen'}{item.auditRole==='scope' && ' · Afbakening, geen toetsnorm'}</small>
          <h4>{item.title}</h4>
          <p>{item.auditNorm || item.body}</p>
          {!matchInCriterion && <small>Treffer via toepassingsvoorwaarden, groep of bronomschrijving.</small>}
          {item.effectiveStatus==='future' && <span className="provision-status">Voorbereiding · controleer ingangsdatum</span>}
        </div>
        <div className="criterion-result-actions">
          {item.auditRole!=='scope' && <Button variant={selectedKeys.includes(item.originKey)?'outline':'default'} disabled={disabled}
            aria-label={(selectedKeys.includes(item.originKey)?'Deselecteer norm ':'Voeg norm toe ')+item.id}
            onClick={()=>onChoose(item.originKey,!selectedKeys.includes(item.originKey))}>
            {selectedKeys.includes(item.originKey)?'Geselecteerd · deselecteren':'Toevoegen aan onderzoek'}
          </Button>}
          <Button variant="outline" disabled={disabled} aria-label={'Bekijk norm '+item.id} onClick={()=>onOpen(item.sourceId,item.id)}>Bekijk norm</Button>
        </div>
      </article>)}
    </section>)}
    {matches.length>20 && <nav className="foundation-pagination" aria-label="Pagina’s zoekresultaten normen">
      <span>{current*20+1}–{Math.min((current+1)*20,matches.length)} van {matches.length}</span>
      <Button variant="outline" disabled={current===0} onClick={()=>onPage(current-1)}>Vorige normen</Button>
      <Button variant="outline" disabled={current===last} onClick={()=>onPage(current+1)}>Volgende normen</Button>
    </nav>}
  </section>;
}
