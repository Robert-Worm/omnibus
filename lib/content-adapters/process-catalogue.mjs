// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/process-catalogue.mjs";
import { retiredThemeIds } from "@/lib/catalogue-retirement.mjs";
import {createSourceFilter} from '../source-catalogue-filter.mjs';
// Editorial navigation links, not a declaration of complete normative process coverage.
export const processes = data.processes;
processes.push({id:'PR05',title:'Inkoop en contractbeheer',keywords:'aanbesteden leveranciers selectie contract concessie inkoop',sourceIds:['AW','TR-THIRD','DORA','DORAFC'],question:'Hoe beheerst de organisatie de voorbereiding, leverancierskeuze en uitvoering van inkoopcontracten?'});
processes.push({id:'PR06',title:'Duurzaamheidsrapportage',keywords:'duurzaamheid verslaglegging csrd esrs ketengegevens rapportage',sourceIds:['CSRD'],question:'Hoe komt de duurzaamheidsrapportage tot stand, van het bepalen van onderwerpen tot de publicatie?'});
processes.push({id:'PR07',title:'Energiebeheer en verduurzaming',keywords:'energie gebouwen renovatie besparing datacenter warmte eed',sourceIds:['EED'],question:'Hoe bepaalt, realiseert en onderbouwt de organisatie de energiemaatregelen die bij haar rol passen?'});
processes.push({id:'PR08',title:'Clouddiensten beheren',keywords:'cloud leveranciers exit gegevens werkplek continuiteit',sourceIds:['CLOUD2026','BIO2','DORA','DORAFC','TR-THIRD'],question:'Hoe beheerst de organisatie haar clouddiensten, van de keuze en inrichting tot uitval en vertrek?'});
processes.push({id:'PR09',title:'AI ontwikkelen en gebruiken',keywords:'ai kunstmatige intelligentie algoritme model trainen inzetten monitoring',sourceIds:['AIRMF','AIA','AVG'],question:'Hoe bepaalt, beoordeelt en beheerst de organisatie de inzet en gevolgen van haar AI-toepassingen?'});
// Added after reviewing the current catalogue. These remain discovery links;
// no source-wide criteria are automatically attached to a research question.
processes.push({id:'PR10',title:'Incidenten en continuïteit beheren',keywords:'incident verstoring crisis herstel bedrijfscontinuiteit uitval',sourceIds:['ITDIENST','ISO27002','BIO2','NISTCSF','NIS2','CBW','DORA','DORAFC','TR-RESIL','WWKE'],question:'Hoe bereidt de organisatie zich voor op verstoringen, handelt zij incidenten af en herstelt zij de dienstverlening?'});
processes.push({id:'PR11',title:'Informatie beheren en openbaar maken',keywords:'archief document informatie bewaren vernietigen publiceren woo openbaarmaking',sourceIds:['WOO','ARCHIEF2026','AVG'],question:'Hoe houdt de organisatie informatie vindbaar en bruikbaar en beslist zij over bewaren, vernietigen en openbaarmaking?'});
processes.push({id:'PR12',title:'Besturing en risicomanagement',keywords:'governance risico compliance besluit rollen toezicht digitale sturing',sourceIds:['ISO31000','IIAERM','COSOCOMP','GOVCODE','3LINES','COBIT','CIO2026','BVA2021','TR-BEHAV'],question:'Hoe verbindt de organisatie haar doelen en besluiten met verantwoordelijkheden, risicoafwegingen en opvolging?'});
processes.push({id:'PR13',title:'Interne audits uitvoeren en verbeteren',keywords:'audit internal audit kwaliteit onafhankelijkheid advies assurance',sourceIds:['GIAS','3LINES','IIAERM','TR-CYBER','TR-THIRD','TR-BEHAV','TR-RESIL'],question:'Hoe richt de organisatie de auditfunctie en haar opdrachten in en bewaakt zij onafhankelijkheid, kwaliteit en opvolging?'});
export const activeProcesses = processes.filter(p => !p.themeId || !retiredThemeIds.includes(p.themeId));
// Editorial process topics, not norms or automatic mappings to an entire law.
// Unknown processes must never fall back to another process's question plan.
export const processResearchTopics = data.processResearchTopics;
export const sourceDomains = data.sourceDomains;
export const filterSources = createSourceFilter(processes, sourceDomains);
