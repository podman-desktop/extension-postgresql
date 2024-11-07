<script lang="ts">
import type { Service } from '/@shared/src/models/Service';

export let object: Service;

let visible: boolean = false;
function switchPasswordVisibility() {
  visible = !visible;
}
</script>

<div class="flex flex-col">
  <span>{object.user}</span>
  <button on:click={switchPasswordVisibility} class="opacity-50">{visible ? object.password : '********'}</button>
</div>
