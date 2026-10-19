import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { WorkbenchStore, WorkbenchError } from "./store.mjs";

const assets = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/client.js", ["client.js", "text/javascript; charset=utf-8"]],
  ["/style.css", ["style.css", "text/css; charset=utf-8"]],
]);

export async function startWorkbench({ database, port = 4326 }) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw Error("Ongeldige lokale poort.");
  if (!existsSync(database))
    throw Error("Importeer eerst een backlog in een aparte Workbench-database.");
  const store = new WorkbenchStore(database);
  const token = randomBytes(32).toString("hex");
  const send = (res, status, body, type = "application/json; charset=utf-8") => {
    res.writeHead(status, {
      "Content-Type": type,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Content-Security-Policy":
        "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    });
    res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  };
  const server = createServer(
    { maxHeaderSize: 8192, requestTimeout: 10000, headersTimeout: 10000 },
    async (req, res) => {
      try {
        if (
          req.headers.host !== new URL(origin).host ||
          !req.url?.startsWith("/") ||
          req.url.startsWith("//") ||
          req.url.length > 4096
        )
          throw new WorkbenchError("Ongeldig lokaal verzoek.");
        if (
          req.headers["sec-fetch-site"] === "cross-site" ||
          (req.headers.origin && req.headers.origin !== origin)
        )
          throw new WorkbenchError("Alleen lokale Workbench-verzoeken zijn toegestaan.", 403);
        const url = new URL(req.url, origin);
        if (req.method === "GET") {
          if (req.headers["transfer-encoding"] || Number(req.headers["content-length"] || 0))
            throw new WorkbenchError("Onverwachte verzoekinhoud.");
          if (assets.has(url.pathname) && !url.search) {
            const [name, type] = assets.get(url.pathname);
            return send(res, 200, readFileSync(new URL(`./web/${name}`, import.meta.url)), type);
          }
          if (url.pathname === "/api/overview" && !url.search)
            return send(res, 200, { ...store.overview(), token });
          if (url.pathname === "/api/sources") {
            if (new Set(url.searchParams.keys()).size !== [...url.searchParams.keys()].length)
              throw new WorkbenchError("Dubbel filter.");
            return send(res, 200, store.list(Object.fromEntries(url.searchParams)));
          }
          if (/^\/api\/sources\/[a-f0-9]{64}$/.test(url.pathname) && !url.search)
            return send(res, 200, store.detail(url.pathname.split("/").at(-1)));
        }
        if (
          req.method === "POST" &&
          /^\/api\/sources\/[a-f0-9]{64}\/progress$/.test(url.pathname) &&
          !url.search
        ) {
          const supplied = req.headers["x-workbench-token"];
          if (
            req.headers.origin !== origin ||
            req.headers["content-type"] !== "application/json" ||
            typeof supplied !== "string" ||
            !/^[a-f0-9]{64}$/.test(supplied) ||
            !timingSafeEqual(Buffer.from(supplied), Buffer.from(token))
          )
            throw new WorkbenchError("Heropen de lokale Workbench voordat je opslaat.", 403);
          if (
            req.headers["transfer-encoding"] ||
            !/^\d+$/.test(req.headers["content-length"] || "") ||
            Number(req.headers["content-length"]) > 12000
          )
            throw new WorkbenchError("Te groot of onjuist verzoek.", 413);
          const parts = [];
          let size = 0;
          for await (const part of req) {
            size += part.length;
            if (size > 12000) throw new WorkbenchError("Te groot verzoek.", 413);
            parts.push(part);
          }
          let input;
          try {
            input = JSON.parse(Buffer.concat(parts).toString("utf8"));
          } catch {
            throw new WorkbenchError("Ongeldige JSON.");
          }
          return send(res, 200, store.change(url.pathname.split("/")[3], input));
        }
        throw new WorkbenchError("Niet gevonden.", 404);
      } catch (error) {
        // Database errors can contain private paths or rows. Keep them off HTTP/logs.
        send(res, error instanceof WorkbenchError ? error.status : 500, {
          error:
            error instanceof WorkbenchError ? error.message : "De lokale bewerking is mislukt.",
        });
      }
    },
  );
  server.timeout = 10000;
  server.maxHeadersCount = 30;
  server.once("close", () => store.close());
  try {
    await new Promise((ok, fail) => {
      server.once("error", fail);
      server.listen(port, "127.0.0.1", ok);
    });
  } catch (error) {
    store.close();
    throw error;
  }
  const origin = `http://127.0.0.1:${server.address().port}`;
  return { server, origin };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    if (
      ![2, 4].includes(args.length) ||
      args[0] !== "--database" ||
      (args.length === 4 && (args[2] !== "--port" || !/^\d+$/.test(args[3])))
    )
      throw Error("Gebruik: content:workbench -- --database <workbench.sqlite> [--port 4326]");
    const { server, origin } = await startWorkbench({
      database: resolve(args[1]),
      port: args[3] ? Number(args[3]) : 4326,
    });
    console.log(`Lokale Content Workbench: ${origin}`);
    const stop = () => {
      server.close();
      server.closeAllConnections();
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
