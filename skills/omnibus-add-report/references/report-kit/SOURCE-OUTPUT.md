# Bronuitvoer (identiek inhoudelijk v4.22)

`output/result.json` bevat:

- `records`: volledige records volgens record_contract.py, met source_id en stabiele IDs uit TASK.md. Geen nieuwe samenvattingsschema's ter vervanging van de contractvelden.
- `coverage`: precies één entry per pagina: page, finding_record_ids, excluded_or_context_reason en unresolved_questions. Een herhaling verwijst naar het behouden record; een afbeelding krijgt geen verzonnen tekstspan.
- `supplementary_sources`: id (verplicht, niet supplementary_source_id), kind (CRITERION/RECOMMENDATION/RESEARCH_QUESTION/METHOD_LIMITATION), page, start, end, quote, plain_title, reason. Letterlijke quote en absolute eind-exclusieve offsets.
- `limitations`, `protocol_deviation`, `protocol_reason`: verklaarde beperkingen en echte afwijkingen.

READ-LOG.json bevat author_agent, text_pages_read, visual_pages_read, source_text_sha256, source_pdf_sha256 en een concrete beschrijving van werkelijk uitgevoerde lezing/onzekerheden. VISUAL-EVIDENCE.json legt de visuele observaties en gevolgen vast. Bewaar de eerste definitieve inzending ongewijzigd. De coördinator bevriest beide eerste versies vóór vergelijking.
