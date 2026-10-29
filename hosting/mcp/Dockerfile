# Separate opt-in image; never used by the existing website start.
FROM node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS build
WORKDIR /source
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
RUN node scripts/package-mcp.mjs --out /mcp-package

FROM node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20
ENV NODE_ENV=production
COPY --from=build --chown=root:root --chmod=a-w /mcp-package /app/mcp
WORKDIR /app/mcp
USER 1000:1000
EXPOSE 8080
# Both mounts must be supplied explicitly and read-only. Missing/incorrect pins
# fail before listening. The hosting edge must supply TLS and preserve headers.
CMD ["node", "--max-old-space-size=128", "start-read-only-http.mjs", "--build-directory", "/data", "--online-config", "/config/online.json", "--gateway-host", "0.0.0.0", "--port", "8080"]
