<script lang="ts">
import { router } from 'tinro';
import type { Service } from '/@shared/src/models/Service';

export let object: Service;

function openDetails(): void {
  router.goto(`/${object.containerId}/summary`);
}
</script>

<button
  title="Open service details"
  class="text-[var(--pd-table-body-text-highlight)] w-full text-ellipsis overflow-hidden"
  on:click={openDetails}>
  {object.name}
</button>
