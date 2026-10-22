export type DatabaseSource = { schema: 1; release: string; version: string; indexHash: string };
export type ContentRef = {release:string;hash:string;bytes?:number};
export type ContentTransfer = Omit<ContentRef,'bytes'> & {bytes:ArrayBuffer};
export type DatabasePage = { page: number; text: string; incompleteText?: boolean };
export type SourceIndex = {
  version: string;
  metadata: { id: string; source_sha256: string };
  pages: { page: number; start: number; end: number; sha256: string }[];
  contents: { page: number; start: number; text: string }[];
};
export function sourceJsonHash(value: unknown): Promise<string>;
export function assertDatabaseSource(ref: unknown): asserts ref is DatabaseSource;
export function createDatabaseSourceClient(options?: {
  fetchImpl?: typeof fetch; maxEntries?: number; maxBytes?: number; timeoutMs?: number; transferBytes?:number; batchContent?:boolean;
}): {
  content(ref:ContentRef, options?:{signal?:AbortSignal}):Promise<unknown>;
  copyContentTransfers(refs:ContentRef[],known?:ReadonlySet<string>):ContentTransfer[];
  stageContentTransfers(values:ContentTransfer[]):void;
  transferStats():{entries:number;retainedBytes:number};
  index(ref: DatabaseSource, options?: { signal?: AbortSignal }): Promise<SourceIndex>;
  page(ref: DatabaseSource, index: SourceIndex, number: number, options?: { signal?: AbortSignal }):
    Promise<{ start: number; end: number; sha256: string; page: DatabasePage }>;
  stats(): { entries: number; retainedBytes: number };
};
export const databaseSourceClient: ReturnType<typeof createDatabaseSourceClient>;
