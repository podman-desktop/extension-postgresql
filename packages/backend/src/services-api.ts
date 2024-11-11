import type * as podmanDesktopApi from '@podman-desktop/api';
import type { ServicesApi } from '/@shared/src/ServicesApi';
import type { Service } from '/@shared/src/models/Service';
import type { ServicesManager } from './managers/services';
import { getFreePort } from './utils/port';

export class ServicesApiImpl implements ServicesApi {
  constructor(
    private readonly extensionContext: podmanDesktopApi.ExtensionContext,
    private webview: podmanDesktopApi.Webview,
    private servicesManager: ServicesManager,
  ) {}

  async getServices(): Promise<Service[]> {
    return this.servicesManager.getServices();
  }

  async getServiceDetails(containerId: string): Promise<Service> {
    return this.servicesManager.getServiceDetails(containerId);
  }

  async getConnectionStrings(
    containerId: string,
  ): Promise<{ uri: { obfuscated: string; clear: string }; kv: { obfuscated: string; clear: string } }> {
    return this.servicesManager.getConnectionStrings(containerId);
  }

  async getServiceImages(): Promise<Map<string, string>> {
    return this.servicesManager.getServiceImages();
  }

  async getFreePort(port: number): Promise<number> {
    return getFreePort(port);
  }

  async createService(serviceName: string, imageWithTag: string, localPort: number, dbname: string | undefined, user: string | undefined, password: string): Promise<string> {
    return this.servicesManager.createService(serviceName, imageWithTag, localPort, dbname, user, password);
  }
}
