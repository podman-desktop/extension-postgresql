export function getTabUrl(routerPath: string, tabUrl: string): string {
  const baseURL = routerPath.substring(0, routerPath.lastIndexOf('/'));
  return `${baseURL}/${tabUrl}`;
}

export function isTabSelected(routerPath: string, tabUrl: string): boolean {
  return routerPath === getTabUrl(routerPath, tabUrl);
}
