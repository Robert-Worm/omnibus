// Optional technical design, based on the user's supplied audit-design excerpt.
// Editorial question aids, not an IIA taxonomy or a prescribed research method.
export const approachChoices = {
  breadth: [
    {id:'broad', label:'Breedtestrategie'},
    {id:'deep', label:'Dieptestrategie'},
  ],
  lens: [
    {id:'descriptive', label:'Procedureel (beschrijvend)'},
    {id:'causal', label:'Causaal (toetsend)'},
  ],
};
export function validateResearchApproach(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Ongeldige onderzoeksaanpak.');
  const result = {};
  for (const key of Object.keys(approachChoices)) {
    if (value[key] === undefined || value[key] === '') continue;
    if (!approachChoices[key].some(choice=>choice.id===value[key])) throw Error('Ongeldige onderzoeksaanpak.');
    result[key] = value[key];
  }
  return result;
}
export function researchApproachText(value) {
  const a = validateResearchApproach(value ?? {});
  return [approachChoices.breadth.find(c=>c.id===a.breadth)?.label,
    approachChoices.lens.find(c=>c.id===a.lens)?.label].filter(Boolean).join(' · ');
}
export const causalApproachNote = 'Interviewantwoorden geven mogelijke verklaringen. Onderzoek ook andere verklaringen en aanvullend bewijs voordat je conclusies trekt over oorzaken.';

// Only populated cells in the supplied "3. Technisch ontwerp" table are attributed
// to that table. Empty cells mean "not elaborated", not "methodologically forbidden".
const tableRows = {
  signaling: [
    ['Vaststellen hoe vaak een eventueel probleem voorkomt.','Hoe vaak komt een (eventueel) probleem voor?'],
    ['Begrijpen waaruit een eventueel probleem in een concrete situatie bestaat.','Waaruit bestaat een (eventueel) probleem?'],
    null, null,
  ],
  diagnostic: [null, null,
    ['Toetsen of een veronderstelde oorzaak in meerdere onderzochte situaties een rol speelt.','Is sprake van een breed geldende oorzaak?'],
    ['Onderzoeken waarom een veronderstelde oorzaak in een specifieke situatie deze gevolgen heeft.','Waarom heeft de veronderstelde oorzaak deze impact?'],
  ],
  design: [
    ['Beoordelen of de voorgestelde oplossing de volle breedte van de problemen afdekt.','Dekt deze oplossing de problemen in de volle breedte af?'],
    ['Nagaan welke aspecten van de oplossing moeilijk te implementeren zijn.','Wat zijn de moeilijk te implementeren aspecten van de oplossing?'],
    ['Toetsen of de voorgestelde interventie de oorzaken van het probleem wegneemt.','Neemt deze interventie de oorzaken van het probleem weg?'],
    ['Onderzoeken of de interventie past bij de unieke problematiek van een specifieke afdeling of situatie.','Doet deze interventie recht aan de unieke problematiek van afdeling X?'],
  ],
  change: [
    ['Nagaan of de interventie in de hele onderzochte organisatie volgens planning verloopt.','Verloopt de interventie in de hele organisatie volgens planning?'],
    ['Het verloop van het implementatieproces in een specifieke situatie in beeld brengen.','Hoe verloopt het implementatieproces?'],
    ['Onderzoeken of de randvoorwaarden voor verandering aanwezig zijn en de verandering kunnen ondersteunen.','Zijn de randvoorwaarden voor verandering aanwezig?'],
    ['Verklaren waarom het veranderproces in een specifieke afdeling of situatie stokt.','Waarom stokt het proces bij afdeling X?'],
  ],
  evaluative: [
    ['De omvang van het bereikte effect van de oplossing in beeld brengen.','Hoeveel effect heeft de oplossing gehad?'],
    null,
    ['Onderzoeken in hoeveel gevallen het effect aan de maatregel kan worden toegeschreven.','Bij hoeveel gevallen heeft de maatregel tot het effect geleid?'],
    ['Verklaren hoe de maatregel in een specifieke situatie aan het gewenste effect heeft bijgedragen.','Waarom heeft de maatregel tot het gewenste effect geleid? Of was de maatregel de oorzaak van het oplossen van het probleem?'],
  ],
};
export function approachCombinations(direction) {
  return [['descriptive','broad','Procedureel breed'],['descriptive','deep','Procedureel diep'],
    ['causal','broad','Causaal breed'],['causal','deep','Causaal diep']].map(([lens,breadth,label],i)=>({
      id:`${lens}-${breadth}`,lens,breadth,label,
      description:tableRows[direction]?.[i]?.[0] || '',
      example:tableRows[direction]?.[i]?.[1] || '',
      inSourceTable:Boolean(tableRows[direction]?.[i]),
    }));
}

export function refineDirectionPlan(plan, direction, topic, value, subjectKind = {}) {
  const a = validateResearchApproach(value ?? {});
  if (!a.breadth && !a.lens) return plan;
  const t = topic.trim();
  const proposal = subjectKind.proposal ?? /^(?:het|de|een) (?:(?:voorgestelde|beoogde)\s+|(?:[\p{L}-]*plan|voorstel|ontwerp|oplossing|raamovereenkomst)\b)/iu.test(t);
  const changeTopic = (subjectKind.change ?? /^(?:de |het )?(?:invoering|implementatie|overstap|uitrol)\b/iu.test(t)) ? t : `de invoering bij ${t}`;
  const where = a.breadth === 'broad' ? ' in de onderzochte onderdelen' : a.breadth === 'deep' ? ' in de onderzochte situatie' : '';
  const central = {
    signaling: {
      descriptive:`Welke eventuele knelpunten doen zich voor bij ${t}${where}?`,
      causal:`Welke factoren kunnen eventuele knelpunten bij ${t}${where} verklaren?`,
    },
    diagnostic: {
      descriptive:`Welke patronen zijn zichtbaar rond de knelpunten bij ${t}${where}?`,
      causal:`Welke verklaringen voor de knelpunten bij ${t}${where} worden door het bewijs ondersteund?`,
    },
    design: {
      descriptive:proposal ? `In hoeverre dekt ${t} het beoogde probleem en de geldende eisen af${where}?` : `In hoeverre dekt het voorgestelde ontwerp het probleem en de eisen bij ${t}${where}?`,
      causal:proposal ? `Via welke werking kan ${t} het beoogde probleem verhelpen${where}?` : `Hoe kan het voorgestelde ontwerp de oorzaken van het probleem bij ${t}${where} aanpakken?`,
    },
    change: {
      descriptive:plan.text.replace(/\?$/, `${where}?`),
      causal:`Welke factoren verklaren het verloop van ${changeTopic}${where}?`,
    },
    evaluative: {
      descriptive:`Welke beoogde resultaten zijn bereikt bij ${t}${where}?`,
      causal:`In hoeverre heeft de gekozen aanpak bijgedragen aan de resultaten bij ${t}${where}?`,
    },
  };
  let text = a.lens ? central[direction][a.lens] : plan.text.replace(/\?$/, `${where}?`);
  const solution = proposal ? t : `de voorgestelde oplossing voor ${t}`;
  // These templates follow the distinct purpose of each populated table cell,
  // rather than merely appending "broad" or "deep" to the same question.
  const combinationText = {
    signaling: {
      'descriptive-broad':`Hoe vaak doen zich eventuele problemen voor bij ${t} in de onderzochte onderdelen?`,
      'descriptive-deep':`Waaruit bestaat het eventuele probleem bij ${t} in de onderzochte situatie?`,
    },
    diagnostic: {
      'causal-broad':`Welke mogelijke oorzaken van knelpunten bij ${t} worden in meerdere onderzochte situaties door bewijs ondersteund?`,
      'causal-deep':`In hoeverre verklaren de veronderstelde oorzaken de knelpunten bij ${t} in de onderzochte situatie?`,
    },
    design: {
      'descriptive-broad':`In hoeverre dekt ${solution} de onderzochte problemen in de volle breedte af?`,
      'descriptive-deep':`Welke aspecten van ${solution} zijn mogelijk moeilijk uit te voeren?`,
      'causal-broad':`In hoeverre kan ${solution} de onderbouwde oorzaken van het probleem wegnemen?`,
      'causal-deep':`Hoe sluit ${solution} aan op de specifieke oorzaken en omstandigheden in de onderzochte situatie?`,
    },
    change: {
      'descriptive-broad':`In hoeverre verloopt ${changeTopic} in de onderzochte onderdelen volgens planning?`,
      'descriptive-deep':`Hoe verloopt ${changeTopic} in de onderzochte situatie?`,
      'causal-broad':`In hoeverre zijn de randvoorwaarden aanwezig die ${changeTopic} mogelijk maken?`,
      'causal-deep':`Welke factoren bevorderen of belemmeren ${changeTopic} in de onderzochte situatie?`,
    },
    evaluative: {
      'descriptive-broad':`Welke veranderingen zijn na de aanpak van ${t} zichtbaar, en hoe groot zijn die?`,
      'causal-broad':`In hoeveel onderzochte gevallen heeft de aanpak van ${t} bijgedragen aan het beoogde effect?`,
      'causal-deep':`In hoeverre heeft de aanpak van ${t} in de onderzochte situatie bijgedragen aan het beoogde effect?`,
    },
  };
  text = combinationText[direction]?.[`${a.lens}-${a.breadth}`] || text;
  const questions = [...plan.questions];
  // Breadth is not automatically a representative sample; depth is not proof of a cause.
  if (a.breadth === 'broad') questions[0] = {
    signaling:'Waar komen eventuele knelpunten voor, hoe vaak en met welke gevolgen?',
    diagnostic:'Welke knelpunten zijn aantoonbaar en hoe verspreid komen ze voor?',
    design:'Welke problemen en eisen moet het ontwerp in de onderzochte onderdelen afdekken?',
    change:'Welke planning en mijlpalen gelden voor de onderzochte onderdelen?',
    evaluative:'Welke doelen en uitgangssituaties gelden voor de onderzochte onderdelen?',
  }[direction];
  if (a.breadth === 'deep') questions[0] = {
    signaling:'Wat gebeurt er in de onderzochte situatie en wie ondervindt eventuele problemen?',
    diagnostic:'Hoe heeft het knelpunt zich in deze situatie ontwikkeld?',
    design:'Welk probleem en welke eisen staan centraal in de onderzochte situatie?',
    change:'Welke stappen, afspraken en betrokkenen bepalen de invoering in deze situatie?',
    evaluative:'Welke verandering was in deze situatie beoogd en wat was de uitgangssituatie?',
  }[direction];
  if (a.lens === 'descriptive') {
    questions[1] = {
      signaling:'Welke verschillen zijn zichtbaar tussen de praktijk en de geldende verwachtingen?',
      diagnostic:'Onder welke omstandigheden treedt het knelpunt wel en niet op?',
      design:'Welke onderdelen van het probleem en de eisen worden wel en niet door het ontwerp afgedekt?',
      change:'Hoe verloopt de uitvoering ten opzichte van de planning en afspraken?',
      evaluative:'Welke resultaten en onbedoelde gevolgen zijn zichtbaar ten opzichte van de uitgangssituatie?',
    }[direction];
    questions[2] = {
      signaling:'Wie ondervindt gevolgen en hoe groot zijn die gevolgen?',
      diagnostic:'Welke terugkerende patronen geven aanknopingspunten voor nader onderzoek naar oorzaken?',
      design:'Welke uitvoeringsproblemen en ontbrekende randvoorwaarden komen in beeld?',
      change:'Hoe ervaren betrokkenen de samenhang en belasting van de invoering?',
      evaluative:'In hoeverre zijn de afgesproken doelen bereikt en is het oorspronkelijke probleem opgelost?',
    }[direction];
  } else if (a.lens === 'causal') {
    questions[1] = direction === 'design'
      ? 'Via welke stappen zou het ontwerp de oorzaken aanpakken, en welke aannames moeten daarvoor kloppen?'
      : 'Welke mogelijke verklaringen zijn er, en welke andere factoren kunnen een rol spelen?';
    questions[2] = direction === 'design'
      ? 'Welk bewijs ondersteunt de verwachte werking, en onder welke omstandigheden zou die uitblijven?'
      : 'Welk bewijs ondersteunt of weerlegt deze verklaringen, en wat blijft onzeker?';
  }
  if (direction === 'design' && a.lens === 'descriptive' && a.breadth === 'deep') {
    questions[1] = 'Welke onderdelen zijn in deze situatie mogelijk moeilijk uit te voeren, en waar blijkt dat uit?';
    questions[2] = 'Welke mensen, middelen en afspraken zijn nodig om die onderdelen uitvoerbaar te maken?';
  }
  if (direction === 'change' && a.lens === 'causal' && a.breadth === 'broad') {
    questions[0] = 'Welke randvoorwaarden zijn volgens de veranderaanpak nodig, en waarom?';
    questions[1] = 'Waar zijn deze randvoorwaarden wel en niet aanwezig, en welke verschillen zijn zichtbaar in de voortgang?';
  }
  const approach = a.lens === 'causal' ? causalApproachNote : a.lens === 'descriptive'
    ? 'Beschrijf de praktijk en vergelijk situaties, afspraken en resultaten. Zichtbare patronen bewijzen op zichzelf geen oorzakelijk verband.' : plan.approach;
  return {...plan, text, questions, approach};
}
