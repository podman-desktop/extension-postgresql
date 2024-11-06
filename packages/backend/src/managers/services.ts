import * as podmanDesktopApi from '@podman-desktop/api';
import { Service } from '/@shared/src/models/Service';
import { Messages } from '/@shared/src/Messages';

// For now, we are only managing this image, this could be configurable,
// or extended to several images
const SERVICE_IMAGE = 'docker.io/library/postgres:';

export class ServicesManager {
  
  private services: Map<string, Service> = new Map();

  constructor(
    private readonly extensionContext: podmanDesktopApi.ExtensionContext,
    private webview: podmanDesktopApi.Webview,
  ) {}

  async loadContainers(): Promise<void> {
    const containers = await podmanDesktopApi.containerEngine.listContainers();
    const pgContainers = containers.filter(c => c.Image.startsWith(SERVICE_IMAGE))
    const set = new Set<string>(this.services.keys());
    for (const pgContainer of pgContainers) {
      this.add(pgContainer);
      set.delete(pgContainer.Id);
    }
    for (const toRemove of set.keys()) {
      this.services.delete(toRemove);
    }
    this.sendState();
  }

  async init(): Promise<void> {
    podmanDesktopApi.containerEngine.onEvent((evt: podmanDesktopApi.ContainerJSONEvent) => {
      if (evt.Type === 'container') {
        this.loadContainers();
      }
    });
    this.loadContainers();
  }

  add(container: podmanDesktopApi.ContainerInfo): void {
    this.services.set(container.Id, {
      name: container.Names.length ? (container.Names[0].startsWith('/') ? container.Names[0].slice(1): container.Names[0]) : 'unknown',
      containerId: container.Id,
      providerId: container.engineId,
    });
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
}
