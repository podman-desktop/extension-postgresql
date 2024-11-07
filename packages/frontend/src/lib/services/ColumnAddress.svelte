<script lang="ts">
import type { Service } from '/@shared/src/models/Service';

export let object: Service;
</script>

{#if object.port}
  localhost:{object.port}
{:else}
  N/A
{/if}
