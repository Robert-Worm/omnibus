# Bestandscontract en bediening

De bestaande viewerstructuur en het v4.22-recordcontract blijven gelden. Dit document beschrijft het gedeelde administratieve envelope; inhoudelijke records komen uit het onveranderde contract. Lever de werkelijke waarden, geen voorbeeld- of placeholderredenen.

| Bestand | Verplichte inhoud |
|---|---|
| RECONCILED-SOURCE.json | author_agent, source_id, records, supplementary_sources, coverage, limitations, first_submission_mapping en supplementary_reconciliation_mapping |
| first_submission_mapping entry | role (`extractor`/`inventory`), first_record_id, final_record_ids, disposition (`RETAIN/MERGE/REPAIR/EXCLUDE/CONTEXT/UNRESOLVED_WITH_LIMIT`), specifieke reason |
| supplementary_reconciliation_mapping entry | role, first_supplementary_id, final_supplementary_ids, additional_final_record_ids, reason |
| RECONCILIATION-LOG.json | author_agent, invoerchecksums, daadwerkelijke beslissingen, all_page_read_log met per page: text_read, visual_read en inhoudelijke paginaverantwoording |
| audit-proposals.json | Volledige afzonderlijk geschreven praktische ketens, onderbouwing en context; geen automatische omzetting van iedere bronclaim naar een item |
| AUTHORING.json | author_agent, proposal_sha256, methode en human_validation:false |
| RELEASE-BINDING.json | Paden en extern vertrouwde checksums van het vaste vrijgavemanifest en de onafhankelijke technische APPROVE-review; door init geverifieerd en vastgelegd. |
| Externe fasebewijzen / STAGE-INDEX.json | Per fase start- en eindbewijs met actor, vastgelegde invoer, afhankelijkheden, uitvoer en werkelijke uitvoeringswaarneming. STAGES.json is uitsluitend een gecontroleerde afleiding hiervan. |
| APP-DRAFT.json / APP-FINAL.json | Bestaande viewer-envelope: source{id,pages[{page,text}]}, framework{report{id,title,source_hash,pdf_hash,...},lines,evidence}. Alle brontekstpagina's samen zijn exact source.txt. Bestaande aanvullende viewerfields behouden. |
| lines entry | id, report_id, title, entity, researchGroup, exportContext, alle acht velden, controlStatus. Ieder veld bevat text, reason, basis, evidence_ids. Zie QUALITY.md voor bases. finding.text is exact één gekoppeld RESULT-citaat; exportContext staat ook in finding.reason. |
| controlStatus | design/implementation/operation: ieder {value:NOT_ESTABLISHED,explanation:specifieke onderbouwing}. Geen fictieve huidige werking. |
| evidence entry | id, report_id, role RESULT/CONTEXT, page, page_end, start, end, quote. Alle offsets/citaten letterlijk en pagina-overlap correct. |
| CATALOGUE-DRAFT.json / CATALOGUE.json | theme{id,title,...}, preset{key,text,...}, groups[{id,key,text,...}], process_mappings[{process_id,line_ids,reason}]. Thema benoemt onderwerp, niet alleen rapporttitel. |
| INCLUSION-DECISIONS.json | decisions: ieder record_id exact eenmaal, decision INCLUDE/CONTEXT/EXCLUDE, line_ids en reason. supplement_decisions: ieder supplement_id exact eenmaal, decision CONTEXT/EXCLUDE, line_ids en reason. |
| APP-SOURCE-LINKS.json | links: ieder line_id exact eenmaal, record_ids en specifieke reason gericht op daadwerkelijke assertion-targets. INCLUDE-associaties kloppen in beide richtingen. |
| audit-draft-review.json | reviewer_agent, decision APPROVE/REVISE, target_hashes van beide conceptbestanden, alle item_reviews met acht field_assessments, required_changes lijst met id en concrete herstelopdracht |
| REPAIRS.json | author_agent, draft_review_sha256, app_final_sha256, catalogue_sha256, dispositions[{id,resolution}]. Vermeld ook bewust ongewijzigde items; verzin geen defect als er geen was. |
| ISSUES.json | issues[{id,status,raised_by,affected_targets,resolution}]. Status RESOLVED of ACCEPTED_SOURCE_LIMIT voor vrijgave; OPEN tijdens herstel. Beperkingen mogen nooit als opgeloste feitelijke bronfout worden verborgen. |
| Beide eindreviews | Exact envelope in REVIEW-CONTRACT.json; alle zes actuele target_hashes, geen open issues, inhoudelijke assessments per item/veld en proces. Bronreview bevat daarnaast volledige reading_log met auteur, tekst-/beeldpagina's en bronchecksums. |

De eindreviewtargets zijn APP-FINAL.json, CATALOGUE.json, RECONCILED-SOURCE.json, INCLUSION-DECISIONS.json, APP-SOURCE-LINKS.json en REVIEW-BASIS.json. REVIEW-BASIS bindt de afhankelijkheden waaronder ISSUES, REPAIRS, eerste inzendingen, logs en taxonomie. Verandert één afhankelijkheid, maak een nieuwe basis en laat beide reviewers de actuele eindversie bevestigen.

## Vaste commando's

Gebruik de gebundelde Python met `-B -X utf8`. Vanuit deze pakketmap:

```text
python tools/workflow.py init <ingevulde-config.json>
python tools/workflow.py stage-start <rapportmap> --stage <fasenaam> --actor <werkelijke-agent-id>
python tools/workflow.py stage-finish <rapportmap> --stage <fasenaam> --start-sha256 <bewaarde-startchecksum> --observation <werkelijke-uitvoeringswaarneming>
python tools/workflow.py freeze-first <rapportmap> --coordinator <werkelijke-coordinator-id>
python tools/workflow.py snapshot <rapportmap> --name voor-herstel-01
python tools/workflow.py snapshot <rapportmap> --name na-herstel-01
python tools/workflow.py diff <rapportmap>/snapshots/voor-herstel-01 <rapportmap>/snapshots/na-herstel-01
python tools/workflow.py review-basis <rapportmap>
python tools/workflow.py review-targets <rapportmap>
python tools/workflow.py seal <rapportmap> --attestation <werkelijke-rolverklaring.json> --revision 1
python tools/workflow.py verify <rapportmap> --receipt <extern-ontvangstbewijs> --receipt-sha256 <extern-vastgelegde-checksum>
```

`init` maakt lege outputmappen, extractietekst, beeldpagina's, contractkopieën, actuele basisfreeze en taxonomiesnapshot. Het leest geen bron namens de inhoudelijke agents. Falen tijdens voorbereiding kan een onvolledige map achterlaten: die is niet vrijgegeven. Bewaar die ter diagnose en begin in een nieuwe map; geen automatische opschoning of overschrijving.

`freeze-first` controleert eerste uitvoer en bevriest die, zonder claims te beoordelen. `review-basis` kan extra inhoudelijke afhankelijkheden opnemen met herhaald `--extra <relatief-pad>`. Eerdere afgeleide basis/stagebestanden blijven onder versions/ bewaard. `seal` maakt alleen na bestaande exacte eindreviews een ontvangstbewijs en voert de gate uit; alleen PASS_FOR_PARENT_REVIEW is mechanisch akkoord. Bij HOLD blijven fouten zichtbaar. Nieuwe poging gebruikt een nieuw revision-nummer; oude ontvangstbewijzen blijven bestaan.

Geen commando activeert rapporten, beoordeelt bruikbaarheid, sluit inhoudelijke issues namens een reviewer, koopt tokens of start een volgend rapport. Een ongelezen of onbruikbaar rapport krijgt een gemotiveerde HOLD/non-eligible beslissing; maak geen kunstmatige bevinding om een niet-lege gate te halen.
