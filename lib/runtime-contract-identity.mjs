import { digest } from "../content-tools/identity.mjs";
import { runtimeContract } from "./runtime-contract.mjs";

// Shared by build and runtime without importing build plugins into the server.
export const runtimeContractHash = digest(runtimeContract);
