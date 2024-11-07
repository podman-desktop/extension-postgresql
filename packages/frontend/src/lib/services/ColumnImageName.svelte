<script lang="ts">
import type { Service } from '/@shared/src/models/Service';

export let object: Service;
</script>

<div class="flex flex-col">
  <span>{object.imageName}</span>
  <span class="opacity-50">{object.imageVersion}</span>
</div>
