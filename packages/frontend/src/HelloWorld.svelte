<script lang="ts">
import { faHandSpock } from '@fortawesome/free-solid-svg-icons';
import { EmptyScreen, Button } from '@podman-desktop/ui-svelte';
import { helloWorldClient } from './api/client';

/**
 * HelloWorld component.
 * We use the Podman Desktop UI Svelte component to render a simple "EmptyScreen" component with a title, message and icon.
 *
 * A button is also rendered which when clicked will call the "hello" method from the "helloWorldClient" API client which communicates with the backend.
 */
</script>

<EmptyScreen
  title="Hello World!"
  message="This is a simple example of a Svelte component via podman-desktop/ui-svelte used for rendering the webview of your extension."
  icon={faHandSpock}>
  <Button on:click={() => helloWorldClient.hello()}>Click me!</Button>
</EmptyScreen>
