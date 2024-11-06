import { Service } from './models/Service';

export abstract class ServicesApi {
  abstract getServices(): Promise<Service[]>;
}
