# Omnibus als online versie, voor elke containerhost (zoals Sliplane).
# Bouwt de app, haalt de openbare database uit de GitHub-release, controleert die,
# en zet alles alleen-lezen in één image. Geen aparte databasedienst of schijf nodig.
#
# Op je eigen computer (alleen Docker nodig, geen kopie van de code):
#   docker build -t omnibus -f hosting/container/Dockerfile https://github.com/Robert-Worm/omnibus.git#main
#   docker run --rm -p 8080:8080 omnibus
#   en open http://localhost:8080
#
# Online: geef PUBLIC_ORIGIN mee met het openbare https-adres, bijvoorbeeld
#   docker run -p 8080:8080 -e PUBLIC_ORIGIN=https://omnibus.rijksmap.nl omnibus
#
# Een nieuwe database? Pas DATABASE_URL en DATABASE_SHA256 hieronder aan (of geef ze
# mee als build-argument) en bouw opnieuw.

# Official multi-platform index verified 2026-10-24; keep both stages identical.
# Verification and recovery: docs/beheer/storingen-en-herstel.md
FROM node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS bouw
WORKDIR /bron
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
ARG DATABASE_URL=https://github.com/Robert-Worm/omnibus/releases/download/database-2026-10-29-correctie/omnibus-database-2026-10-29-wwke.zip
ARG DATABASE_SHA256=2b339914d0fc2936c3329f380dea28453f1c934fa2e2648d7f3a74c7694492cc
ARG OMNIBUS_CODE_REVISION
# Sliplane supplies this public build identifier; never use a runtime override.
ARG SLIPLANE_COMMIT_HASH
RUN node scripts/fetch-release-database.mjs --url "$DATABASE_URL" --sha256 "$DATABASE_SHA256" --out /database \
 && node scripts/check-runtime-database.mjs --settings /database/local-build.json \
 && OMNIBUS_CODE_REVISION="${OMNIBUS_CODE_REVISION:-$SLIPLANE_COMMIT_HASH}" npm run build:runtime -- --settings /database/local-build.json \
 && npm run package:runtime -- --web-root runtime-build --database /database/catalogue.sqlite --out /pakket

FROM node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20
ENV NODE_ENV=production
# Standaard voor gebruik op je eigen computer; een host zet hier het openbare https-adres.
# Een andere poort lokaal (-p 3000:8080)? Geef dan PUBLIC_ORIGIN=http://localhost:3000 mee.
ENV PUBLIC_ORIGIN=http://localhost:8080
COPY --from=bouw --chown=root:root --chmod=a-w /pakket /app/omnibus-runtime
COPY --from=bouw --chown=root:root --chmod=a-w /database /var/lib/omnibus
WORKDIR /app/omnibus-runtime
USER 1000:1000
EXPOSE 8080
# PORT geeft de host door; PUBLIC_ORIGIN is het adres waarop bezoekers de app openen.
CMD ["sh", "-c", "exec node --max-old-space-size=200 scripts/start-runtime-package.mjs --settings /var/lib/omnibus/local-build.json --public-origin \"$PUBLIC_ORIGIN\" --listen-host 0.0.0.0 --port \"${PORT:-8080}\""]
