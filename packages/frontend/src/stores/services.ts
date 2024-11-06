import { readable, type Readable } from 'svelte/store';
import type { Service } from '/@shared/src/models/Service';
import { rpcBrowser, servicesClient } from '../api/client';
import { Messages } from '/@shared/src/Messages';

export const services: Readable<Service[]> = readable<Service[]>([], set => {
  const sub = rpcBrowser.subscribe(Messages.MSG_NEW_SERVICES_STATE, msg => {
    set(msg);
  });
  // Initialize the store initially
  servicesClient
    .getServices()
    .then(services => {
      set(services);
    })
    .catch((err: unknown) => console.error('Error getting services:', err));
  return () => {
    sub.unsubscribe();
  };
});