"use client";
import type {ComponentProps} from 'react';
import ExportCreator from './export-creator';
import {workformMarkdown} from '@/lib/workform-markdown.mjs';
import {exportFilename} from '@/lib/export-design.mjs';
import {download} from '@/lib/browser-download.mjs';

export type Props=Omit<ComponentProps<typeof ExportCreator>,'onMarkdown'>;
export default function ExportEntryContent(props:Props){
  return <ExportCreator {...props} onMarkdown={(draft,options)=>download(
    workformMarkdown(props.framework,draft,options),
    exportFilename(options.filename||draft.title,options.profile,options.version,'md'),
    'text/markdown;charset=utf-8')}/>;
}
