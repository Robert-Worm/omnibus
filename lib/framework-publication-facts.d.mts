export type FrameworkPublication={issuer:string;publication:string;dateLabel:string;published:string;adopted?:string;effective?:string;entryNote?:string;application?:string};
export const frameworkPublicationFacts:Record<string,FrameworkPublication>;
export function frameworkPublication(id:string):FrameworkPublication|undefined;
