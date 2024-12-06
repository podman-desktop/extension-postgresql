<script lang="ts">
import type { Service } from '/@shared/src/models/Service';

export let object: Service;
</script>

{#if object.pgadmin}
  <span>localhost:{object.pgAdminPort}</span>
{:else}N/A
{/if}
