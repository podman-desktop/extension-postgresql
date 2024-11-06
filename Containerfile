FROM scratch as builder
COPY packages/backend/dist/ /extension/dist
COPY packages/backend/package.json /extension/
COPY packages/backend/media/ /extension/media
COPY LICENSE /extension/
COPY packages/backend/icon.png /extension/
COPY README.md /extension/

FROM scratch

LABEL org.opencontainers.image.title="Your Hello World Extension" \
        org.opencontainers.image.description="Hello World Extension" \
        org.opencontainers.image.vendor="Your Org / Username" \
        io.podman-desktop.api.version=">= 1.12.0"

COPY --from=builder /extension /extension
