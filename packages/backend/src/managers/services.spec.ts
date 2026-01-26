import { beforeEach, expect, test } from 'vitest';
import { ServicesManager } from './services';
import * as podmanDesktopApi from '@podman-desktop/api';

const extensionContext: podmanDesktopApi.ExtensionContext = {} as podmanDesktopApi.ExtensionContext;

const webview: podmanDesktopApi.Webview = {} as podmanDesktopApi.Webview;

class TestServicesManager extends ServicesManager {
  constructor(extensionContext: podmanDesktopApi.ExtensionContext, webview: podmanDesktopApi.Webview) {
    super(extensionContext, webview);
  }
  override getRuntimePath(localPath: string): string {
    return super.getRuntimePath(localPath);
  }
}

let servicesManager: TestServicesManager = {} as TestServicesManager;

beforeEach(() => {
  servicesManager = new TestServicesManager(extensionContext, webview);
});

test('isServiceImage returns false for non-postgres image and without expected label', () => {
  expect(
    servicesManager.isServiceImage({
      Image: 'httpd',
    } as podmanDesktopApi.ContainerInfo),
  ).toBeFalsy();
});

test('isServiceImage returns true for postgres image', () => {
  expect(
    servicesManager.isServiceImage({
      Image: 'docker.io/library/postgres:v42',
    } as podmanDesktopApi.ContainerInfo),
  ).toBeTruthy();
});

test('isServiceImage returns true for postgres with expected label', () => {
  const labels: { [key: string]: string } = {
    'postgres.baseImage': 'docker.io/library/postgres:v42',
  };
  expect(
    servicesManager.isServiceImage({
      Image: 'my-image',
      Labels: labels,
    } as podmanDesktopApi.ContainerInfo),
  ).toBeTruthy();
});

test('isServiceImage returns false for postgres with unexpected label', () => {
  const labels: { [key: string]: string } = {
    'postgres.baseImage': 'my-base-image',
  };
  expect(
    servicesManager.isServiceImage({
      Image: 'my-image',
      Labels: labels,
    } as podmanDesktopApi.ContainerInfo),
  ).toBeFalsy();
});

test('isPgadminImage returns true when image is the expected one', () => {
  expect(
    servicesManager.isPgadminImage({
      Image: 'docker.io/dpage/pgadmin4:v42',
    } as podmanDesktopApi.ContainerInfo),
  ).toBeTruthy();
});

test('isPgadminImage returns false when image is not the expected one', () => {
  expect(
    servicesManager.isPgadminImage({
      Image: 'my-image',
    } as podmanDesktopApi.ContainerInfo),
  ).toBeFalsy();
});

test('isPgadminForContainer is true when label in admin container points to container', () => {
  const container: podmanDesktopApi.ContainerInfo = {
    Id: 'container1',
  } as podmanDesktopApi.ContainerInfo;
  const labels: { [key: string]: string } = {
    'postgres.containerId': 'container1',
  };
  const adminContainer: podmanDesktopApi.ContainerInfo = {
    Labels: labels,
  } as podmanDesktopApi.ContainerInfo;
  expect(servicesManager.isPgadminForContainer(adminContainer, container)).toBeTruthy();
});

test('isPgadminForContainer is false when label in admin container does not point to container', () => {
  const container: podmanDesktopApi.ContainerInfo = {
    Id: 'container1',
  } as podmanDesktopApi.ContainerInfo;
  const labels: { [key: string]: string } = {
    'postgres.containerId': 'container2',
  };
  const adminContainer: podmanDesktopApi.ContainerInfo = {
    Labels: labels,
  } as podmanDesktopApi.ContainerInfo;
  expect(servicesManager.isPgadminForContainer(adminContainer, container)).toBeFalsy();
});

test('isPgadminForContainer is false when no label', () => {
  const container: podmanDesktopApi.ContainerInfo = {
    Id: 'container1',
  } as podmanDesktopApi.ContainerInfo;
  const adminContainer: podmanDesktopApi.ContainerInfo = {} as podmanDesktopApi.ContainerInfo;
  expect(servicesManager.isPgadminForContainer(adminContainer, container)).toBeFalsy();
});

test('getServiceName returns image description when known', () => {
  expect(servicesManager.getServiceImage('docker.io/library/postgres:v42')).toEqual('postgres Docker Official Image');
});

test('getServiceName returns image name when unknown', () => {
  expect(servicesManager.getServiceImage('quay.io/me/my-image:v42')).toEqual('quay.io/me/my-image');
});

test('getRuntimePath returns local path when on Windows', () => {
  (podmanDesktopApi.env as { isWindows: boolean }).isWindows = true;
  expect(servicesManager.getRuntimePath('C:\\Users\\me\\Documents\\myfile.txt')).toEqual(
    '/mnt/c/Users/me/Documents/myfile.txt',
  );
});

test('getRuntimePath returns local path when on non-Windows', () => {
  (podmanDesktopApi.env as { isWindows: boolean }).isWindows = false;
  expect(servicesManager.getRuntimePath('/home/me/Documents/myfile.txt')).toEqual('/home/me/Documents/myfile.txt');
});
