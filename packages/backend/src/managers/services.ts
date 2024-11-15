import * as podmanDesktopApi from '@podman-desktop/api';
import type { Service } from '/@shared/src/models/Service';
import { Messages } from '/@shared/src/Messages';
import { Script } from '/@shared/src/ServicesApi';
import { mkdir, mkdtemp, rm, rmdir, writeFile } from 'fs/promises';
import { join } from 'path';

// For now, we are only managing this image, this could be configurable,
// or extended to several images
const SERVICE_IMAGES = new Map<string, string>([
  ['docker.io/library/postgres:', 'postgres Docker Official Image'],
  ['docker.io/pgvector/pgvector:', 'pgvector/pgvector'],
]);

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

  async createService(serviceName: string, imageWithTag: string, localPort: number, dbname: string | undefined, user: string | undefined, password: string, interImageName: string | undefined, scripts: Script[]): Promise<string> {
    const provider = await this.getFirstProvider();
    await podmanDesktopApi.containerEngine.pullImage(provider.connection, imageWithTag, () => { /* todo logs */});
    const engineId = await this.getFirstEngine();
    const envs = [
      `POSTGRES_PASSWORD=${password}`,
    ];
    if (!!dbname) {
      envs.push(`POSTGRES_DB=${dbname}`);
    }
    if (!!user) {
      envs.push(`POSTGRES_USER=${user}`);
    }

    let image: string = imageWithTag;
    if (interImageName && scripts.length) {
      image = interImageName;
      const extensionDirectory = this.extensionContext.storagePath;
      await mkdir(join(extensionDirectory, 'build', 'images'), { recursive: true });
      const contextdir = await mkdtemp(join(extensionDirectory, 'build', 'images', 'job-'));
      for (let script of scripts) {
        await writeFile(join(contextdir, script.name), script.content);
      }
      let containerFile = `
FROM ${imageWithTag}
`;
      for (let script of scripts) {
        containerFile += `
ADD ${script.name} /docker-entrypoint-initdb.d/${script.name}
        `;
      }

      const containerfilePath = join(contextdir, 'Containerfile');
      await writeFile(containerfilePath, containerFile);

      await podmanDesktopApi.containerEngine.buildImage(contextdir, (eventName: 'stream' | 'error' | 'finish', data: string) => {
        // TODO display logs
      }, {
        provider: provider.connection,
        containerFile: 'Containerfile',
        tag: interImageName,
        // TODO add labels to list this image as base image
      });
      await rm(contextdir, { recursive: true, force: true });
    }

    const container = await podmanDesktopApi.containerEngine.createContainer(engineId, {
      name: serviceName,
      Image: image,
      Env: envs,
      HostConfig: {
        PortBindings: {
          '5432/tcp': [
            {
              HostIp: '0.0.0.0',
              HostPort: `${localPort}`,
            }
          ],
        },
      },
      Labels: {
        'postgres.baseImage': imageWithTag,
      },
    });
    return container.id;
  }

  async getFirstProvider(): Promise<podmanDesktopApi.ProviderContainerConnection> {
    const providers: podmanDesktopApi.ProviderContainerConnection[] = podmanDesktopApi.provider.getContainerConnections();
    const firstProvider = providers.find(({ connection }) => connection.type === 'podman' && connection.status() === 'started');
    if (!firstProvider) {
      throw new Error('no provider found');
    }
    return firstProvider;
  }

  async getFirstEngine(): Promise<string> {
    const provider = await this.getFirstProvider();
    const infos = await podmanDesktopApi.containerEngine.listInfos({ provider: provider.connection });
    if (infos.length < 1) {
      throw new Error('no engine found');
    }
    const engine = infos[0];
    return engine.engineId;
  }
}
