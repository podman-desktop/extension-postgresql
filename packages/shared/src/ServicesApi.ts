import type { Service } from './models/Service';

export abstract class ServicesApi {
  abstract getServices(): Promise<Service[]>;
  abstract getServiceDetails(containerId: string): Promise<Service>;
}
