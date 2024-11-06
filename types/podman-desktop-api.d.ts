// eslint-disable-next-line etc/no-commented-out-code
// podman-desktop-api.d.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  export interface PodmanDesktopApi {
    getState: () => any;
    postMessage: (msg: any) => void;
    setState: (newState: any) => void;
  }

  function acquirePodmanDesktopApi(): PodmanDesktopApi;
}

// Creating a global variable to store the PodmanDesktopApi
// allows the API to be accessed from anywhere in the codebase (types, testing, etc.)
export { PodmanDesktopApi };
