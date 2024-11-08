import type { Service } from './models/Service';

export abstract class ServicesApi {
  abstract getServices(): Promise<Service[]>;
  abstract getServiceDetails(containerId: string): Promise<Service>;
  abstract getConnectionStrings(
    containerId: string,
  ): Promise<{ uri: { obfuscated: string; clear: string }; kv: { obfuscated: string; clear: string } }>;
}
