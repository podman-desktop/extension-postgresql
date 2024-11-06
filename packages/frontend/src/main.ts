import { mount } from 'svelte';
import App from './App.svelte';

/**
 * Mount the Svelte app to the target element with the id 'app'.
 * using the default App.svelte component we've created.
 */
const target = document.getElementById('app');
let app;
if (target) {
  app = mount(App, { target });
}
export default app;
