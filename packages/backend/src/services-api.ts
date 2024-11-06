import * as podmanDesktopApi from '@podman-desktop/api';
import { ServicesApi } from '/@shared/src/ServicesApi';
import { Service } from '/@shared/src/models/Service';
import { ServicesManager } from './managers/services';

export class ServicesApiImpl implements ServicesApi {
  constructor(
    private readonly extensionContext: podmanDesktopApi.ExtensionContext,
    private webview: podmanDesktopApi.Webview,
    private servicesManager: ServicesManager,
  ) {}

  async getServices(): Promise<Service[]> {
    return this.servicesManager.getServices();
  }
}
