import { buildDatabase } from "./build-database-web.mjs";

// Same application and data validation; separate output and no personal AI path.
buildDatabase(process.argv.slice(2), { portable: true });
