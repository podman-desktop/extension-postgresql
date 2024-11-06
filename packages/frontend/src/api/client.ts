import type { HelloWorldApi } from '/@shared/src/HelloWorldApi';
import { RpcBrowser } from '/@shared/src/messages/MessageProxy';

/**
 * This file is the client side of the API. It is used to communicate with the backend, which allows
 * cross-communication between the frontend and backend through an RPC-like communication.
 *
 */
export interface RouterState {
  url: string;
}
const podmanDesktopApi = acquirePodmanDesktopApi();
export const rpcBrowser: RpcBrowser = new RpcBrowser(window, podmanDesktopApi);
export const helloWorldClient: HelloWorldApi = rpcBrowser.getProxy<HelloWorldApi>();

// The below code is used to save the state of the router in the podmanDesktopApi, so
// that we can determine the correct route to display when the extension is reloaded.
export const saveRouterState = (state: RouterState) => {
  podmanDesktopApi.setState(state);
};

const isRouterState = (value: unknown): value is RouterState => {
  return typeof value === 'object' && !!value && 'url' in value;
};

export const getRouterState = (): RouterState => {
  const state = podmanDesktopApi.getState();
  if (isRouterState(state)) return state;
  return { url: '/' };
};
