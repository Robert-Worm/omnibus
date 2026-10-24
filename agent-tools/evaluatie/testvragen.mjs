// Tien vaste testvragen voor de AI-koppeling (#186). Een AI-agent beantwoordt ze via de zes
// hulpmiddelen; daarna vergelijk je zijn antwoord met `antwoord`. Idee uit de evaluatiegids van
// anthropics/mcp-builder (Apache-2.0). Opgesteld op de openbare database van 19 oktober 2026.
//
// `controle` is een deterministische controle op de agent-build, zonder AI. Zo meldt
// `npm run agent:testvragen` een vraag die bij een nieuwe database niet meer klopt.
// Pas een vraag dan bewust aan; nooit stil.

export const RELEASE = "03c6d2c60af9a8636b7e5a585de6fb5e67a75aaa7dfffa9605041f4bc6841f2b";

export const TESTVRAGEN = [
  { id: "T01", vraag: "Hoeveel bronnen kun je in Omnibus kiezen, en hoeveel daarvan zijn rapporten, wetten of kaders, en modellen?",
    hulpmiddelen: ["list_sources"], antwoord: "43 bronnen: 27 rapporten, 2 wetten of kaders en 14 onderzoeksmodellen.",
    controle: (i) => [i.bronnen().length, i.bronnen("report").length, i.bronnen("law").length, i.bronnen("model").length].join("/") === "43/27/2/14" },
  { id: "T02", vraag: "Welk rapport gaat over de samenwerking tussen LVVN en RVO, en hoeveel toetspunten kun je eruit kiezen?",
    hulpmiddelen: ["search_building_blocks", "list_sources"], antwoord: "LVVN26, ‘Samenwerkingsrelatie LVVN RVO’, met 14 toetspunten.",
    controle: (i) => i.aantal("LVVN26") === 14 && /Samenwerkingsrelatie LVVN RVO/.test(i.bronTitel("LVVN26")) },
  { id: "T03", vraag: "Wat is de titel van toetspunt LVVN26-K02/TP01, en op welke pagina's van het rapport staat de onderbouwing?",
    hulpmiddelen: ["get_building_block"], antwoord: "‘Integrale portefeuilleafweging’, op pagina 6 en 7.",
    controle: (i) => { const m = i.bouwsteen("LVVN26|LVVN26-K02/TP01").material; return m.title === "Integrale portefeuilleafweging" && /pagina 6/.test(m.location) && /pagina 7/.test(m.location); } },
  { id: "T04", vraag: "Uit welke bron komt toetspunt C26-P-003-01 over de departementale CIO, en waar staat het in die bron?",
    hulpmiddelen: ["search_building_blocks", "get_building_block"], antwoord: "Uit het Besluit CIO-stelsel Rijksdienst 2026; onder meer artikel 2, lid 1 en artikel 3, lid 1.",
    controle: (i) => { const m = i.bouwsteen("CIO2026-REEXTRACT-1|C26-P-003-01").material; return /Besluit CIO-stelsel Rijksdienst 2026/.test(m.sourceTitle) && /Artikel 2, lid 1/.test(m.location) && /Artikel 3, lid 1/.test(m.location); } },
  { id: "T05", vraag: "Welk toetspunt uit de Wet weerbaarheid kritieke entiteiten gaat over het vermelden van sectoruitzonderingen?",
    hulpmiddelen: ["search_building_blocks"], antwoord: "WWA-P-0025, ‘Sectoruitzonderingen expliciet vermelden’.",
    controle: (i) => i.bouwsteen("WWKE-20260815-ASTRA-R1|WWA-P-0025").material.title === "Sectoruitzonderingen expliciet vermelden" },
  { id: "T06", vraag: "Wat is, letterlijk, de interviewvraag op operationeel niveau bij SERVQUAL-vraag SQ-ASSURANCE-Q07?",
    hulpmiddelen: ["search_building_blocks", "get_building_block"], antwoord: "‘Kunt u vertellen hoe u een inhoudelijke vraag van een afnemer behandelde bij uw werk?’",
    controle: (i) => i.bouwsteen("SERVQUAL|SQ-ASSURANCE-Q07|operational").material.question === "Kunt u vertellen hoe u een inhoudelijke vraag van een afnemer behandelde bij uw werk?" },
  { id: "T07", vraag: "Lees de volledige brontekst van toetspunt IVHO25-K10/TP01 in delen van 1.000 tekens. Hoeveel tekens is de tekst, en hoeveel delen had je nodig?",
    hulpmiddelen: ["get_building_block"], antwoord: "5.664 tekens, in 6 delen.",
    controle: (i) => Array.from(i.bouwsteen("IVHO25|IVHO25-K10/TP01").material.sourceText).length === 5664 },
  { id: "T08", vraag: "Wat staat er in toetspunt LVVN26-K99/TP01?",
    hulpmiddelen: ["get_building_block"], antwoord: "Dat toetspunt bestaat niet of is niet vrijgegeven. De AI zegt dat en verzint geen inhoud.",
    controle: (i) => !i.bestaat("LVVN26|LVVN26-K99/TP01") },
  { id: "T09", vraag: "Welke onderzoeksmodellen gaan over verandering in een organisatie?",
    hulpmiddelen: ["list_sources", "search_building_blocks"], antwoord: "ADKAR (‘een verandering doormaken’) en Kotter (‘organisatieverandering in beweging’).",
    controle: (i) => i.bronnen("model").filter((b) => /veranderin/i.test(b.title)).map((b) => b.id).sort().join(",") === "ADKAR,KOTTER" },
  { id: "T10", vraag: "Welke werkvormen voor een Excel kun je kiezen, en wat moet je doen voordat de AI een project of Excel opslaat?",
    hulpmiddelen: ["get_workflow_guide"], antwoord: "Normtoetsing, Risico-controlmatrix en Interviewleidraad. Vóór opslaan vraagt de AI jouw akkoord; pas dan geeft hij `consent: true` mee.",
    controle: (i) => /Normtoetsing[\s\S]*Risico-controlmatrix[\s\S]*Interviewleidraad/.test(i.gids()) && /consent=true/.test(i.gids()) },
];
