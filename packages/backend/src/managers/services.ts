import * as podmanDesktopApi from '@podman-desktop/api';
import type { Service } from '/@shared/src/models/Service';
import { Messages } from '/@shared/src/Messages';
import type { CreateServiceOptions } from '/@shared/src/ServicesApi';
import { chmod, mkdir, mkdtemp, writeFile } from 'fs/promises';
import { join } from 'path';
import { getFreePort } from '../utils/port';

const SECOND: number = 1_000_000_000;

// For now, we are only managing this image, this could be configurable,
// or extended to several images
const SERVICE_IMAGES = new Map<string, string>([
  ['docker.io/library/postgres:', 'postgres Docker Official Image'],
  ['docker.io/pgvector/pgvector:', 'pgvector/pgvector'],
]);

const PGADMIN_IMAGE = 'docker.io/dpage/pgadmin4';

interface PodInfo {
  engineId: string;
  Id: string;
}

export interface CreatePgadminContainerOptions {
  containerId: string;
  dbname: string;
  user: string;
  password: string;
  port: number;
}

export class ServicesManager {
  private services: Map<string, Service> = new Map();

  constructor(
    private readonly extensionContext: podmanDesktopApi.ExtensionContext,
    private webview: podmanDesktopApi.Webview,
  ) {}

  /**
   * reload the containers, if the event has been received for a container of interest
   * or if containerId is undefined
   *
   * containerId: the container for which an event has been received
   */
  async loadContainers(containerId: string | undefined): Promise<void> {
    const containers = await podmanDesktopApi.containerEngine.listContainers();
    const pgContainers = containers.filter(c => this.isServiceImage(c));
    const pgadminContainers = containers.filter(c => this.isPgadminImage(c));
    if (
      containerId === undefined ||
      pgContainers.find(c => c.Id === containerId) ||
      pgadminContainers.find(c => c.Id === containerId)
    ) {
      const set = new Set<string>(this.services.keys());
      for (const pgContainer of pgContainers) {
        const pgadminContainer = pgadminContainers.find(pgc => this.isPgadminForContainer(pgc, pgContainer));
        await this.add(pgContainer, pgadminContainer);
        set.delete(pgContainer.Id);
      }
      for (const toRemove of set.keys()) {
        this.services.delete(toRemove);
      }
      this.sendState();
    }
  }

  async init(): Promise<void> {
    const disposable = podmanDesktopApi.containerEngine.onEvent(async (evt: podmanDesktopApi.ContainerJSONEvent) => {
      if (evt.Type === 'container' && evt.status !== 'health_status') {
        await this.loadContainers(evt.status === 'remove' ? undefined : evt.id);
      }
    });
    this.extensionContext.subscriptions.push(disposable);
    podmanDesktopApi.provider.onDidRegisterContainerConnection(async () => {
      this.loadContainers(undefined).catch((err: unknown) => {
        console.debug('initial load containers', err);
      });
    });
    podmanDesktopApi.provider.onDidUnregisterContainerConnection(async () => {
      this.loadContainers(undefined).catch((err: unknown) => {
        console.debug('initial load containers', err);
      });
    });
    podmanDesktopApi.provider.onDidUpdateContainerConnection(async e => {
      if (e.status === 'started' || e.status === 'stopped') {
        this.loadContainers(undefined).catch((err: unknown) => {
          console.debug('initial load containers', err);
        });
      }
    });
    try {
      await this.loadContainers(undefined);
    } catch (err: unknown) {
      console.debug('initial load containers', err);
    }
  }

  async getServiceFromContainerInfo(
    container: podmanDesktopApi.ContainerInfo,
    pgadminContainer?: podmanDesktopApi.ContainerInfo,
  ): Promise<Service> {
    const inspect = await podmanDesktopApi.containerEngine.inspectContainer(container.engineId, container.Id);

    const name = container.Names[0].startsWith('/') ? container.Names[0].slice(1) : container.Names[0];

    const labels = pgadminContainer ? pgadminContainer.Labels : inspect.Config.Labels;
    return {
      running: inspect.State.Running,
      name: container.Names.length ? name : 'unknown',
      imageName: this.getServiceImage(container.Image),
      imageVersion: this.getImageVersion(container.Image),
      containerId: container.Id,
      engineId: container.engineId,
      port: this.getPort(container.Ports),
      dbName: this.getDb(inspect.Config.Env),
      user: this.getUser(inspect.Config.Env),
      password: this.getPassword(inspect.Config.Env),
      pgadmin: this.getPgadmin(inspect.Config.Labels) || !!pgadminContainer,
      pgAdminPort:
        this.getPgadmin(inspect.Config.Labels) || !!pgadminContainer ? this.getPgadminPort(labels) : undefined,
    };
  }

  async add(
    container: podmanDesktopApi.ContainerInfo,
    pgadminContainer?: podmanDesktopApi.ContainerInfo,
  ): Promise<void> {
    this.services.set(container.Id, await this.getServiceFromContainerInfo(container, pgadminContainer));
  }

  sendState(): void {
    this.webview
      .postMessage({
        id: Messages.MSG_NEW_SERVICES_STATE,
        body: this.getServices(),
      })
      .catch((err: unknown) => {
        console.error(`Something went wrong while emitting services: ${String(err)}`);
      });
  }

  getServices(): Service[] {
    return Array.from(this.services.values());
  }

  isServiceImage(imageInfo: podmanDesktopApi.ContainerInfo): boolean {
    if (imageInfo.Labels) {
      for (const [key, value] of Object.entries(imageInfo.Labels)) {
        if (key === 'postgres.baseImage' && Array.from(SERVICE_IMAGES.keys()).some(name => value.startsWith(name))) {
          return true;
        }
      }
    }
    return Array.from(SERVICE_IMAGES.keys()).some(name => imageInfo.Image.startsWith(name));
  }

  isPgadminImage(imageInfo: podmanDesktopApi.ContainerInfo): boolean {
    return imageInfo.Image.startsWith(PGADMIN_IMAGE);
  }

  isPgadminForContainer(pgadminContainer: podmanDesktopApi.ContainerInfo, pgContainer: podmanDesktopApi.ContainerInfo) {
    if (pgadminContainer.Labels) {
      for (const [key, value] of Object.entries(pgadminContainer.Labels)) {
        if (key === 'postgres.containerId' && value === pgContainer.Id) {
          return true;
        }
      }
    }
    return false;
  }

  getServiceImage(imageName: string): string {
    const rawImageName = Array.from(SERVICE_IMAGES.keys()).find(name => imageName.startsWith(name));
    if (!rawImageName) {
      const parts = imageName.split(':');
      return parts[0];
    }
    return SERVICE_IMAGES.get(rawImageName) ?? 'unknown';
  }

  getImageVersion(imageName: string): string {
    const parts = imageName.split(':');
    let version = 'unknown';
    if (parts.length > 1) {
      version = parts[1];
    }
    return version;
  }

  getPort(ports: podmanDesktopApi.Port[]): number {
    if (ports.length > 0) {
      return ports[0].PublicPort;
    }
    return 0;
  }

  private getEnvValue(envs: string[], envName: string): string | undefined {
    const env = envs.find(env => env.startsWith(`${envName}=`));
    return env?.slice(envName.length + 1);
  }

  getPassword(envs: string[]): string {
    return this.getEnvValue(envs, 'POSTGRES_PASSWORD') ?? 'unknown';
  }

  getUser(envs: string[]): string {
    return this.getEnvValue(envs, 'POSTGRES_USER') ?? 'postgres';
  }

  getDb(envs: string[]): string {
    return this.getEnvValue(envs, 'POSTGRES_DB') ?? this.getUser(envs);
  }

  getPgadmin(labels: { [label: string]: string }): boolean {
    return 'pgadmin.port' in labels;
  }

  getPgadminPort(labels: { [label: string]: string }): number {
    if (!('pgadmin.port' in labels)) {
      throw new Error('pgadmin.port is not a label');
    }
    const str = labels['pgadmin.port'];
    return parseInt(str);
  }

  async getServiceDetails(containerId: string): Promise<Service> {
    const service = this.services.get(containerId);
    if (!service) {
      throw new Error(`service not found: ${containerId}`);
    }
    return service;
  }

  // SPEC: https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING
  async getConnectionStrings(
    containerId: string,
  ): Promise<{ uri: { obfuscated: string; clear: string }; kv: { obfuscated: string; clear: string } }> {
    const service = this.services.get(containerId);
    if (!service) {
      throw new Error(`service not found: ${containerId}`);
    }
    return {
      uri: {
        obfuscated: `postgresql://${service.user}:***@localhost:${service.port}/${service.dbName}`,
        clear: `postgresql://${service.user}:${service.password}@localhost:${service.port}/${service.dbName}`,
      },
      kv: {
        obfuscated: `host=localhost port=${service.port} dbname=${service.dbName} user=${service.user} password=***`,
        clear: `host=localhost port=${service.port} dbname=${service.dbName} user=${service.user} password=${service.password}`,
      },
    };
  }

  getServiceImages(): Map<string, string> {
    return SERVICE_IMAGES;
  }

  async createService(serviceName: string, options: CreateServiceOptions): Promise<string> {
    if (options.pgadmin && options.pgadminLocalPort === undefined) {
      throw new Error('pgAdminLocalPort must be defined when pgadmin is set');
    }

    const provider = await this.getFirstPodmanProvider();
    await podmanDesktopApi.containerEngine.pullImage(provider.connection, options.imageWithTag, () => {
      // eslint-disable-next-line sonarjs/todo-tag
      /* todo logs */
    });
    const engineId = await this.getFirstPodmanEngine();

    let pod: PodInfo | undefined = undefined;
    // With pgadmin, we create a pod which will contain the postgres container + the pgadmin container
    if (options.pgadmin) {
      pod = await this.createServicePod(provider.connection, serviceName, options);
    }

    const container = await this.createMainContainer(provider.connection, engineId, pod, serviceName, options);

    // Without pgadmin, the container is started as-is
    if (!options.pgadmin) {
      await podmanDesktopApi.containerEngine.startContainer(container.engineId, container.id);
      return container.id;
    }

    if (!pod) {
      throw new Error('pod should exist');
    }

    await podmanDesktopApi.containerEngine.pullImage(provider.connection, 'dpage/pgadmin4', () => {
      // eslint-disable-next-line sonarjs/todo-tag
      /* todo logs */
    });

    // With pgadmin, we create the pgadmin container
    await this.createPgadminContainer(engineId, pod, `${serviceName}-pgadmin`, {
      dbname: options.dbname ?? 'postgres',
      user: options.user ?? 'postgres',
      password: options.password,
      port: 5432,
      containerId: container.id,
    });
    // start the pod
    await podmanDesktopApi.containerEngine.startPod(pod.engineId, pod.Id);
    return container.id;
  }

  async getFirstPodmanProvider(): Promise<podmanDesktopApi.ProviderContainerConnection> {
    const providers: podmanDesktopApi.ProviderContainerConnection[] =
      podmanDesktopApi.provider.getContainerConnections();
    const firstProvider = providers.find(
      ({ connection }) => connection.type === 'podman' && connection.status() === 'started',
    );
    if (!firstProvider) {
      throw new Error('no provider found');
    }
    return firstProvider;
  }

  async getFirstPodmanEngine(): Promise<string> {
    const provider = await this.getFirstPodmanProvider();
    const infos = await podmanDesktopApi.containerEngine.listInfos({ provider: provider.connection });
    if (infos.length < 1) {
      throw new Error('no engine found');
    }
    const engine = infos[0];
    return engine.engineId;
  }

  private async createServicePod(
    provider: podmanDesktopApi.ContainerProviderConnection,
    serviceName: string,
    options: CreateServiceOptions,
  ): Promise<PodInfo> {
    return await podmanDesktopApi.containerEngine.createPod({
      name: serviceName,
      portmappings: [
        {
          container_port: 5432,
          host_port: options.localPort,
          host_ip: '0.0.0.0',
          protocol: 'tcp',
          range: 1,
        },
        {
          container_port: 80,
          host_port: options.pgadminLocalPort ?? 0,
          host_ip: '0.0.0.0',
          protocol: 'tcp',
          range: 1,
        },
      ],
      provider,
    });
  }

  private async createMainContainer(
    provider: podmanDesktopApi.ContainerProviderConnection,
    engineId: string,
    pod: PodInfo | undefined,
    serviceName: string,
    options: CreateServiceOptions,
  ): Promise<podmanDesktopApi.ContainerCreateResult> {
    const extensionDirectory = this.extensionContext.storagePath;
    const envs = [`POSTGRES_PASSWORD=${options.password}`];
    if (options.dbname) {
      envs.push(`POSTGRES_DB=${options.dbname}`);
    }
    if (options.user) {
      envs.push(`POSTGRES_USER=${options.user}`);
    }

    const volumeMounts: { source: string; target: string }[] = [];
    if (options.scripts.length) {
      await mkdir(join(extensionDirectory, 'volumes'), { recursive: true });
      const volumeDir = await mkdtemp(join(extensionDirectory, 'volumes', 'main-scripts-'));
      await chmod(volumeDir, '0755');
      for (const script of options.scripts) {
        await writeFile(join(volumeDir, script.name), script.content);
      }
      volumeMounts.push({
        source: volumeDir,
        target: '/docker-entrypoint-initdb.d',
      });
    }

    const Mounts = volumeMounts
      .filter(volume => volume.source && volume.target)
      .map(
        volume =>
          ({
            Target: volume.target,
            Source: volume.source,
            Type: 'bind',
            Mode: 'Z',
          }) as podmanDesktopApi.MountSettings,
      );

    const labels: { [label: string]: string } = {
      'postgres.baseImage': options.imageWithTag,
    };
    if (options.pgadmin) {
      labels['pgadmin.port'] = `${options.pgadminLocalPort}`;
    }
    return podmanDesktopApi.containerEngine.createContainer(engineId, {
      name: serviceName,
      Image: options.imageWithTag,
      Env: envs,
      HostConfig: {
        Mounts,
        PortBindings: pod
          ? undefined
          : {
              '5432/tcp': [
                {
                  HostIp: '0.0.0.0',
                  HostPort: `${options.localPort}`,
                },
              ],
            },
      },
      Labels: labels,
      start: false,
      pod: pod?.Id,
    });
  }

  async createPgadminContainer(
    engineId: string,
    pod: PodInfo | undefined,
    containerName: string,
    options: CreatePgadminContainerOptions,
  ): Promise<podmanDesktopApi.ContainerCreateResult> {
    const extensionDirectory = this.extensionContext.storagePath;
    const volumeMounts: { source: string; target: string }[] = [];
    await mkdir(join(extensionDirectory, 'volumes'), { recursive: true });
    const volumeDir = await mkdtemp(join(extensionDirectory, 'volumes', 'admin-'));
    await chmod(volumeDir, '0755');

    const serversFile = `{
  "Servers": {
    "1": {
      "Name": "${pod ? 'localhost' : 'host.containers.internal'}",
      "Group": "Servers",
      "Host": "${pod ? 'localhost' : 'host.containers.internal'}",
      "Port": ${options.port},
      "MaintenanceDB": "${options.dbname}",
      "Username": "${options.user}",
      "SSLMode": "prefer",
      "PassFile": "/var/lib/pgadmin/pgpass"
    }
  }
}`;
    const serversFilePath = join(volumeDir, 'servers.json');
    await writeFile(serversFilePath, serversFile);

    const pgpassFile = `${pod ? 'localhost' : 'host.containers.internal'}:${options.port}:${options.dbname}:${options.user}:${options.password}
`;
    const pgpassFilePath = join(volumeDir, 'pgpass');
    await writeFile(pgpassFilePath, pgpassFile);

    volumeMounts.push({
      source: this.getRuntimePath(pgpassFilePath),
      target: '/mnt/pgpass',
    });
    volumeMounts.push({
      source: this.getRuntimePath(serversFilePath),
      target: '/pgadmin4/servers.json',
    });

    const Mounts = volumeMounts
      .filter(volume => volume.source && volume.target)
      .map(
        volume =>
          ({
            Target: volume.target,
            Source: volume.source,
            Type: 'bind',
            Mode: 'Z',
          }) as podmanDesktopApi.MountSettings,
      );

    const freePort = await getFreePort(8080);
    const labels: { [label: string]: string } = {};
    if (!pod) {
      labels['postgres.containerId'] = options.containerId;
      labels['pgadmin.port'] = `${freePort}`;
    }

    return podmanDesktopApi.containerEngine.createContainer(engineId, {
      name: containerName,
      Image: `dpage/pgadmin4`,
      Entrypoint: [
        '/bin/sh',
        '-c',
        `
cp /mnt/pgpass /var/lib/pgadmin/pgpass;
chown 5050:0 /var/lib/pgadmin/pgpass;
chmod 0600 /var/lib/pgadmin/pgpass;
chown pgadmin:pgadmin /var/lib/pgadmin/pgpass;
/entrypoint.sh
`,
      ],
      Env: [
        'PGADMIN_CONFIG_SERVER_MODE=False',
        'PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED=False',
        'PGADMIN_DEFAULT_EMAIL=contact@example.com',
        // eslint-disable-next-line sonarjs/no-hardcoded-passwords
        'PGADMIN_DEFAULT_PASSWORD=SuperSecret',
      ],
      HostConfig: {
        Mounts,
        PortBindings: pod
          ? undefined
          : {
              '80/tcp': [
                {
                  HostIp: '0.0.0.0',
                  HostPort: `${freePort}`,
                },
              ],
            },
      },
      start: false,
      pod: pod?.Id,
      HealthCheck: {
        // must be the port INSIDE the container not the exposed one
        Test: ['CMD-SHELL', `wget --no-verbose --tries=1 --spider http://localhost:80/ 2> /dev/null`],
        Interval: SECOND * 5,
        Retries: 30,
        Timeout: SECOND * 2,
      },
      Labels: labels,
    });
  }

  protected getRuntimePath(localPath: string): string {
    if (!podmanDesktopApi.env.isWindows) {
      return localPath;
    }
    const driveLetter = localPath.charAt(0);
    return localPath.replace(`${driveLetter}:\\`, `/mnt/${driveLetter.toLowerCase()}/`).replace(/\\/g, '/');
  }
}
