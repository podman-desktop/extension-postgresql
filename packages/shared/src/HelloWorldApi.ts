/**
 * HelloWorldApi is an interface that defines the abstracted class for the HelloWorldApi, it is a requirement to match this interface to your API implementation.
 * Any changes here should also be made to the backend/src/api-impl.ts file.
 */

export abstract class HelloWorldApi {
  // In backend/src/api-impl.ts, this method is implemented to show a message to the user.
  abstract hello(): Promise<void>;
}
