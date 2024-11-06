import * as podmanDesktopApi from '@podman-desktop/api';
import { ServicesApi } from '/@shared/src/ServicesApi';
import { Service } from '/@shared/src/models/Service';
import { Messages } from '/@shared/src/Messages';

export class ServicesApiImpl implements ServicesApi {
  constructor(
    private readonly extensionContext: podmanDesktopApi.ExtensionContext,
    private webview: podmanDesktopApi.Webview,
  ) {}

  async getServices(): Promise<Service[]> {
    setTimeout(() => {
      this.webview
      .postMessage({
        id: Messages.MSG_NEW_SERVICES_STATE,
        body: [
          {
            name: 'service1',
            containerId: '123',
            providerId: 'provider1',
          },
          {
            name: 'service2',
            containerId: '124',
            providerId: 'provider2',
          },
          {
            name: 'service3',
            containerId: '125',
            providerId: 'provider3',
          },
        ],
      })
      .catch((err: unknown) => {
        console.error(`Something went wrong while emitting services: ${String(err)}`);
      });
    }, 5000);
    return [
      {
        name: 'service1',
        containerId: '123',
        providerId: 'provider1',
      },
      {
        name: 'service2',
        containerId: '124',
        providerId: 'provider2',
      },
    ];
  }
}
