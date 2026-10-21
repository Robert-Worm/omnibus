# Omnibus als online versie, voor elke containerhost (zoals Sliplane).
# Bouwt de app, haalt de openbare database uit de GitHub-release, controleert die,
# en zet alles alleen-lezen in één image. Geen aparte databasedienst of schijf nodig.
#
# Bouwen:  docker build -f hosting/container/Dockerfile -t omnibus .
# Starten: docker run -p 8080:8080 -e PORT=8080 -e PUBLIC_ORIGIN=https://<jouw-adres> omnibus
#
# Een nieuwe database? Pas DATABASE_URL en DATABASE_SHA256 hieronder aan (of geef ze
# mee als build-argument) en bouw opnieuw.

FROM node:24.17.0-bookworm-slim AS bouw
WORKDIR /bron
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
ARG DATABASE_URL=https://github.com/Robert-Worm/omnibus/releases/download/database-2026-10-19/omnibus-database-2026-10-19.zip
ARG DATABASE_SHA256=b50d77a71aba1b9eb7d78ca58384f0c1fcdcc173f4189c1f144f31bef1858349
RUN node scripts/fetch-release-database.mjs --url "$DATABASE_URL" --sha256 "$DATABASE_SHA256" --out /database \
 && node scripts/check-runtime-database.mjs --settings /database/local-build.json \
 && npm run build:runtime -- --settings /database/local-build.json \
 && npm run package:runtime -- --web-root runtime-build --database /database/catalogue.sqlite --out /pakket

FROM node:24.17.0-bookworm-slim
ENV NODE_ENV=production
COPY --from=bouw --chown=root:root --chmod=a-w /pakket /app/omnibus-runtime
COPY --from=bouw --chown=root:root --chmod=a-w /database /var/lib/omnibus
WORKDIR /app/omnibus-runtime
USER 1000:1000
EXPOSE 8080
# PORT geeft de host door; PUBLIC_ORIGIN is het openbare https-adres van de app.
CMD ["sh", "-c", "exec node --max-old-space-size=200 scripts/start-runtime-package.mjs --settings /var/lib/omnibus/local-build.json --public-origin \"$PUBLIC_ORIGIN\" --listen-host 0.0.0.0 --port \"${PORT:-8080}\""]
