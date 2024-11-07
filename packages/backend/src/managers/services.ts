import * as podmanDesktopApi from '@podman-desktop/api';
import type { Service } from '/@shared/src/models/Service';
import { Messages } from '/@shared/src/Messages';

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

  async loadContainers(): Promise<void> {
    const containers = await podmanDesktopApi.containerEngine.listContainers();
    const pgContainers = containers.filter(c => this.isServiceImage(c.Image));
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

  async init(): Promise<void> {
    podmanDesktopApi.containerEngine.onEvent(async (evt: podmanDesktopApi.ContainerJSONEvent) => {
      if (evt.Type === 'container') {
        await this.loadContainers();
      }
    });
    await this.loadContainers();
  }

  async getServiceFromContainerInfo(container: podmanDesktopApi.ContainerInfo): Promise<Service> {
    const inspect = await podmanDesktopApi.containerEngine.inspectContainer(container.engineId, container.Id);
    return {
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

  isServiceImage(imageName: string): boolean {
    return Array.from(SERVICE_IMAGES.keys()).some(name => imageName.startsWith(name));
  }

  getServiceImage(imageName: string): string {
    const rawImageName = Array.from(SERVICE_IMAGES.keys()).find(name => imageName.startsWith(name));
    if (!rawImageName) {
      return 'unknown';
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
}
