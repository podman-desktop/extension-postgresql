import * as podmanDesktopApi from '@podman-desktop/api';
import type { HelloWorldApi } from '/@shared/src/HelloWorldApi';

/**
 * HelloWorldApi is an interface that defines the abstracted class for the HelloWorldApi, it is a requirement to match this interface to your API implementation.
 *
 * The below code can be used with the podmanDesktopApi to showcase the usage of the API, as well as any other "backend" code that you may want to run.
 */
export class helloWorldApi implements HelloWorldApi {
  constructor(private readonly extensionContext: podmanDesktopApi.ExtensionContext) {}

  async hello(): Promise<void> {
    // Showcase the usage of the podmanDesktopApi by notifying the user with a message.
    await podmanDesktopApi.window.showInformationMessage('Hi from the backend package!');
  }
}
