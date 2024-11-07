export interface Service {
  // name of the container
  name: string;
  // name of the image used to start the container
  imageName: string;
  // tag of the image used
  imageVersion: string;
  // Id of the container
  containerId: string;
  // Id of the container's engine
  engineId: string;
  // service port
  port: number;
  // db name
  dbName: string;
  // user to connect to service
  user: string;
  // password to connect to service
  password: string;
}
