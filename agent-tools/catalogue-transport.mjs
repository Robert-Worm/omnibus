// Local transport injected by the host. No fetch, credentials or database writes.
let readContent;
export function configureCatalogueReader(reader) {
  if (readContent) throw Error('The catalogue reader is already configured.');
  readContent = reader;
}
export const databaseSourceClient = {
  async content(ref) {
    if (!readContent) throw Error('The read-only catalogue is not configured.');
    return readContent(ref);
  },
};
