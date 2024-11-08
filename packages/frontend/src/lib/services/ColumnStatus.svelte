<script lang="ts">
import { StatusIcon } from '@podman-desktop/ui-svelte';
import { ContainerIcon } from '@podman-desktop/ui-svelte/icons';
import type { Service } from '/@shared/src/models/Service';
  
export let object: Service;
</script>
  
<StatusIcon icon={ContainerIcon} status={object.running ? 'RUNNING': 'STOPPED'} />
