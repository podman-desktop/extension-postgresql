import * as podmanDesktopApi from '@podman-desktop/api';
import type { Service } from '/@shared/src/models/Service';
import { Messages } from '/@shared/src/Messages';
import { CreateServiceOptions } from '/@shared/src/ServicesApi';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';

// For now, we are only managing this image, this could be configurable,
// or extended to several images
const SERVICE_IMAGES = new Map<string, string>([
  ['docker.io/library/postgres:', 'postgres Docker Official Image'],
  ['docker.io/pgvector/pgvector:', 'pgvector/pgvector'],
]);

interface PodInfo {
  engineId: string;
  Id: string;
};

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
    if (containerId === undefined || pgContainers.find(c => c.Id === containerId)) {
      const set = new Set<string>(this.services.keys());
      for (const pgContainer of pgContainers) {
        await this.add(pgContainer);
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
    try {
      await this.loadContainers(undefined);
    } catch (err: unknown) {
      console.debug('initial load containers', err);
    }
  }

  async getServiceFromContainerInfo(container: podmanDesktopApi.ContainerInfo): Promise<Service> {
    const inspect = await podmanDesktopApi.containerEngine.inspectContainer(container.engineId, container.Id);
    return {
      running: inspect.State.Running,
      name: container.Names.length
        ? container.Names[0].startsWith('/')
          ? container.Names[0].slice(1)
          : container.Names[0]
        : 'unknown',
      imageName: this.getServiceImage(container.Image),
      imageVersion: this.getImageVersion(container.Image),
      containerId: container.Id,
      engineId: container.engineId,
      port: this.getPort(container.Ports),
      dbName: this.getDb(inspect.Config.Env),
      user: this.getUser(inspect.Config.Env),
      password: this.getPassword(inspect.Config.Env),
      pgadmin: this.getPgadmin(inspect.Config.Labels),
      pgAdminPort: this.getPgadmin(inspect.Config.Labels) ? this.getPgadminPort(inspect.Config.Labels) : undefined,
    };
  }

  async add(container: podmanDesktopApi.ContainerInfo): Promise<void> {
    this.services.set(container.Id, await this.getServiceFromContainerInfo(container));
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
    for (const [key, value] of Object.entries(imageInfo.Labels)) {
      if (key === 'postgres.baseImage') {
        if (Array.from(SERVICE_IMAGES.keys()).some(name => value.startsWith(name))) {
          return true;
        }
      }
    }
    return Array.from(SERVICE_IMAGES.keys()).some(name => imageInfo.Image.startsWith(name));
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

  getPgadmin(labels: { [label: string]: string} ): boolean {
    return 'pgadmin.port' in labels;
  }

  getPgadminPort(labels: { [label: string]: string} ): number {
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
    await podmanDesktopApi.containerEngine.pullImage(provider.connection, options.imageWithTag, () => { /* todo logs */});
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
 
    // With pgadmin, we create the pgadmin container
    await this.createPgadminContainer(provider.connection, engineId, pod, serviceName, options);

    // start the pod
    podmanDesktopApi.containerEngine.startPod(pod.engineId, pod.Id);
    return container.id;    
  }

  async getFirstPodmanProvider(): Promise<podmanDesktopApi.ProviderContainerConnection> {
    const providers: podmanDesktopApi.ProviderContainerConnection[] = podmanDesktopApi.provider.getContainerConnections();
    const firstProvider = providers.find(({ connection }) => connection.type === 'podman' && connection.status() === 'started');
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

  private async createServicePod(provider: podmanDesktopApi.ContainerProviderConnection, serviceName: string, options: CreateServiceOptions): Promise<PodInfo> {
    const pod = await podmanDesktopApi.containerEngine.createPod({
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
    return pod;
  }

  private async createMainContainer(provider: podmanDesktopApi.ContainerProviderConnection, engineId: string, pod: PodInfo | undefined, serviceName: string, options: CreateServiceOptions): Promise<podmanDesktopApi.ContainerCreateResult> {
    const extensionDirectory = this.extensionContext.storagePath;
    const envs = [
      `POSTGRES_PASSWORD=${options.password}`,
    ];
    if (!!options.dbname) {
      envs.push(`POSTGRES_DB=${options.dbname}`);
    }
    if (!!options.user) {
      envs.push(`POSTGRES_USER=${options.user}`);
    }

    let volumeMounts: { source: string; target: string }[] = [];
    if (options.scripts.length) {
      await mkdir(join(extensionDirectory, 'volumes'), { recursive: true });
      const volumeDir = await mkdtemp(join(extensionDirectory, 'volumes', 'main-scripts-'));
      await chmod(volumeDir, '0755');
      for (let script of options.scripts) {
        await writeFile(join(volumeDir, script.name), script.content);
      }
      volumeMounts.push({
        source: volumeDir,
        target: '/docker-entrypoint-initdb.d',
      });
    }

    const Mounts = volumeMounts
      .filter(volume => volume.source && volume.target)
      .map(volume => ({
        Target: volume.target,
        Source: volume.source,
        Type: 'bind',
        Mode: 'Z',
      } as podmanDesktopApi.MountSettings));

    const labels: { [label: string]: string }  = {
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
        PortBindings: pod ? undefined : {
          '5432/tcp': [
            {
              HostIp: '0.0.0.0',
              HostPort: `${options.localPort}`,
            }
          ],
        },
      },
      Labels: labels,
      start: false,
      pod: pod?.Id,
    });
  }

  private async createPgadminContainer(provider: podmanDesktopApi.ContainerProviderConnection, engineId: string, pod: PodInfo | undefined, serviceName: string, options: CreateServiceOptions): Promise<podmanDesktopApi.ContainerCreateResult> {
    const extensionDirectory = this.extensionContext.storagePath;
    let volumeMounts: { source: string; target: string }[] = [];
    await mkdir(join(extensionDirectory, 'volumes'), { recursive: true });
    const volumeDir = await mkdtemp(join(extensionDirectory, 'volumes', 'admin-'));

    const serversFile = `{
  "Servers": {
    "1": {
      "Name": "${options.dbname}",
      "Group": "Servers",
      "Host": "localhost",
      "Port": 5432,
      "MaintenanceDB": "${options.dbname}",
      "Username": "${options.user}",
      "SSLMode": "prefer",
      "PassFile": "../../pgpass"
    }
  }
}`;
    const serversFilePath = join(volumeDir, 'servers.json');
    await writeFile(serversFilePath, serversFile);

    const pgpassFile = `localhost:5432:*:${options.user}:${options.password}
`;
    const pgpassFilePath = join(volumeDir, 'pgpass');
    await writeFile(pgpassFilePath, pgpassFile);

    volumeMounts.push({
      source: volumeDir,
      target: '/mnt',
    });

    const Mounts = volumeMounts
      .filter(volume => volume.source && volume.target)
      .map(volume => ({
        Target: volume.target,
        Source: volume.source,
        Type: 'bind',
        Mode: 'Z',
      } as podmanDesktopApi.MountSettings));

    return podmanDesktopApi.containerEngine.createContainer(engineId, {
      name: `${serviceName}-pgadmin`,
      Image: `dpage/pgadmin4`,
      Entrypoint: ['/bin/sh', '-c', `
cp /mnt/servers.json /pgadmin4/servers.json;
cp /mnt/pgpass /var/lib/pgadmin/pgpass;
chown 5050:0 /var/lib/pgadmin/pgpass;
chmod 0600 /var/lib/pgadmin/pgpass;
chown pgadmin:pgadmin /var/lib/pgadmin/pgpass;
/entrypoint.sh
`],
      Env: [
        'PGADMIN_CONFIG_SERVER_MODE=False',
        'PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED=False',
        'PGADMIN_DEFAULT_EMAIL=contact@example.com',
        'PGADMIN_DEFAULT_PASSWORD=SuperSecret',
      ],
      HostConfig: {
        Mounts,
      },
      start: false,
      pod: pod?.Id,
    });
  }
}
