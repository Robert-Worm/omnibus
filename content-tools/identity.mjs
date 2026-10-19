import { createHash } from "node:crypto";

// This format already identifies immutable catalogue releases. Changing it is
// a data migration, not a formatting change. Arrays retain their source order.
export const canonical = (value) =>
  JSON.stringify(value, (_, entry) =>
    entry && typeof entry === "object" && !Array.isArray(entry)
      ? Object.fromEntries(
          Object.keys(entry)
            .sort()
            .map((key) => [key, entry[key]]),
        )
      : entry,
  );

export const digest = (value) =>
  createHash("sha256")
    .update(typeof value === "string" ? value : canonical(value))
    .digest("hex");
