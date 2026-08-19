FROM registry.access.redhat.com/ubi10/nodejs-24-minimal:10.1-1766060610 AS builder

WORKDIR /opt/app-root/src

COPY --chown=1001:1001 . .

RUN npm i -g corepack@0.31.0 && corepack enable

RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM scratch

COPY --from=builder /opt/app-root/src/packages/backend/dist/ /extension/dist
COPY --from=builder /opt/app-root/src/packages/backend/package.json /extension/
COPY --from=builder /opt/app-root/src/packages/backend/pg-icon.woff2 /extension/
COPY --from=builder /opt/app-root/src/LICENSE /extension/
COPY --from=builder /opt/app-root/src/packages/backend/icon.png /extension/
COPY --from=builder /opt/app-root/src/README.md /extension/

LABEL org.opencontainers.image.title="PostgreSQL extension" \
        org.opencontainers.image.description="PostgreSQL extension" \
        org.opencontainers.image.vendor="podman-desktop" \
        io.podman-desktop.api.version=">= 1.21.0"
