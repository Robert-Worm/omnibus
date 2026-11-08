"use client";
import './viewer-readability.css';
import {AfkortingText} from './term-help';

/** Toont toelichtende contexttekst altijd volledig (besluit beheerder 8 november 2026: geen afgekapte tekst). */
export default function CompactContextText({text}:{text:string;label:string;initialExpanded?:boolean}){
 return <div className="compact-context-text" data-expanded="true"><p><AfkortingText text={text} voluit/></p></div>;
}
