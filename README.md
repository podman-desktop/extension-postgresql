# Podman Desktop Extension Full Template

<p align="center">
  <img alt="Hello World" src="/images/helloselkie.png" width="50%">
</p>

## Overview

This template provides a "full" example of creating an extension with a webview that utilizes multiple packages. Within this template, we use three separate packages to distinguish between the frontend, backend, and shared code that connects the frontend and backend.

The "full" template is meant to showcase a full production example which includes multiple frontend and backend technologies such as TypeScript, Svelte and TailwindCSS.

All backend-related code can be separated into its own package, which improves both security and code organization.

The template offers flexibility in creating a Podman Desktop extension that can use the underlying Podman Desktop API and pre-built UI components via [@podman-desktop/ui-svelte](https://www.npmjs.com/package/@podman-desktop/ui-svelte).

With this template, it's as easy as:
* **Backend:** Write 100% TypeScript code.
* **Frontend:** Use Svelte & pre-made UI components from Podman Desktop for rapid UI development.

Tips for using this template:
* Every section is heavily commented to aid understanding. Start with the `backend`, then move on to the `frontend`, and finally explore the `shared` package.
* Adding a new function to connect the frontend and backend requires updates to both `packages/backend/src/api-impl.ts` and `packages/shared/src/HelloWorldApi.ts`.

![hello world](/images/helloworld.png)
![hello world notification](/images/helloworld_notification.png)

## Tech Stack

The tech stack for this extension template includes:

* TypeScript
* Svelte 5
* TailwindCSS
* Yarn

## Architecture

The template is organized into three packages:

* `packages/frontend`: A Svelte/Tailwind-based frontend designed for easy integration with the Podman Desktop official [@podman-desktop/ui-svelte](https://www.npmjs.com/package/@podman-desktop/ui-svelte) package.
* `packages/backend`: The backend code and central configuration area for the extension, managed within `package.json`.
* `packages/shared`: Intermediary code that creates a connection between the frontend and backend via an RPC connection.

## Development

To build and develop the extension, follow these steps:

1. Clone the project or your fork:
```sh
$ git clone https://github.com/containers/podman-desktop-extension-template-webview/
```

2. Run `yarn install` to install all relevant packages:
```sh
$ yarn install
```

3. Create a build:

Creating a build will generate all required files for Podman Desktop to load the extension:

```sh
$ yarn build
```

In the `package.json` and `vite.config.js` files, we create a directory in `/packages/backend/media` that contains all the webview components. You will see output like the following:

```sh
$ yarn build
...
[0] transforming...
[0] ✓ 140 modules transformed.
[0] rendering chunks...
[0] ../backend/media/index.html                           0.48 kB
[0] ../backend/media/fa-v4compatibility-BX8XWJtE.woff2    4.80 kB
[0] ../backend/media/fa-v4compatibility-B9MWI-E6.ttf     10.84 kB
[0] ../backend/media/fa-regular-400-DgEfZSYE.woff2       25.46 kB
[0] ../backend/media/fa-regular-400-Bf3rG5Nx.ttf         67.98 kB
[0] ../backend/media/fa-brands-400-O7nZalfM.woff2       118.07 kB
[0] ../backend/media/fa-solid-900-DOQJEhcS.woff2        157.19 kB
[0] ../backend/media/fa-brands-400-Dur5g48u.ttf         209.38 kB
[0] ../backend/media/fa-solid-900-BV3CbEM2.ttf          423.68 kB
[0] ../backend/media/index-ChFLTcUn.css                 116.79 kB
[0] ../backend/media/index-B6Ge7rjZ.js                  125.62 kB │ map: 1,670.57 kB
[0] ✓ built in 1.49s
[0] yarn --cwd packages/frontend build exited with code 0
✨  Done in 3.02s.
```

These files will be loaded from the extension.

Optionally, you can also use `yarn watch` to continuously rebuild after each change, without needing to re-run `yarn build`:

```sh
$ yarn watch
```

4. Load the extension temporarily within Podman Desktop:

We will load the extension within Podman Desktop to test it. This requires cloning the [Podman Desktop repo](https://github.com/containers/podman-desktop):

```sh
$ git clone https://github.com/containers/podman-desktop
```

Navigate to the directory:

```sh
$ cd podman-desktop
```

Run the `yarn install` command:

```sh
$ yarn install
```

Load the extension using the `yarn watch` command with an additional parameter to load the `backend` packaged data:

```sh
yarn watch --extension-folder ../podman-desktop-extension-template-webview/packages/backend
```

5. Confirm that the extension has been loaded:

You will now see a "Hello World" webview in the Podman Desktop navbar. You can also check the developer console for any logging information indicating that the extension has been loaded successfully.

Example of extension loading:

![loaded](/images/loaded.png)

## Linter, Typecheck, and Formatter

We include additional tools to assist in development, which can be found in the main `package.json` file.

Formatter:
```sh
$ yarn format:fix
```

Linter:
```sh
$ yarn lint:fix
```

Typechecker:
```sh
$ yarn typecheck
```

## Packaging and Publishing

More information on how to package and publish your extension can be found in our [official publishing documentation](https://podman-desktop.io/docs/extensions/publish).

However, we have provided a pre-made Containerfile in this template for you to try.

1. Package your extension by building the image:

```sh
$ podman build -t quay.io/myusername/myextension .
```

2. Push the extension to an external registry:

```sh
$ podman push quay.io/myusername/myextension
```

3. Install via the Podman Desktop "Install Custom..." button:

![custom install](/images/custom_install.png)
