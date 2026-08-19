#
# Copyright (C) 2026 Red Hat, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# SPDX-License-Identifier: Apache-2.0

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
COPY --from=builder /opt/app-root/src/packages/backend/media/ /extension/media
COPY --from=builder /opt/app-root/src/LICENSE /extension/
COPY --from=builder /opt/app-root/src/packages/backend/icon.png /extension/
COPY --from=builder /opt/app-root/src/README.md /extension/

LABEL org.opencontainers.image.title="PostgreSQL extension" \
        org.opencontainers.image.description="PostgreSQL extension" \
        org.opencontainers.image.vendor="podman-desktop" \
        io.podman-desktop.api.version=">= 1.21.0"
