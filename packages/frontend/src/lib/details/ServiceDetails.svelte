<script lang="ts">
import { DetailsPage, Tab } from '@podman-desktop/ui-svelte';
import { onMount } from 'svelte';
import { router } from 'tinro';
import { servicesClient } from '/@/api/client';
import type { Service } from '/@shared/src/models/Service';
import { getTabUrl, isTabSelected } from '../utils';
import Route from '../Route.svelte';

export let containerId: string;

let service: Service | undefined = undefined;

export function goToUpPage(): void {
  router.goto('/');
}

onMount(async () => {
  service = await servicesClient.getServiceDetails(containerId);
});
</script>

{#if service}
  <DetailsPage
    title="Service details"
    breadcrumbLeftPart="Services"
    breadcrumbRightPart="Service details"
    breadcrumbTitle="Go back to Services"
    onclose={goToUpPage}
    onbreadcrumbClick={goToUpPage}>
    <svelte:fragment slot="subtitle">
      <div class="flex gap-x-2 items-center text-[var(--pd-content-sub-header)]">
        <span class="text-xs">{service?.name}</span>
      </div>
    </svelte:fragment>
    <svelte:fragment slot="tabs">
      <Tab title="Summary" selected={isTabSelected($router.path, 'summary')} url={`${containerId}/summary`} />
      <Tab title="Terminal" selected={isTabSelected($router.path, 'terminal')} url={`${containerId}/terminal`} />
    </svelte:fragment>
    <svelte:fragment slot="content">
      <Route path="/summary" breadcrumb="Summary">Summary...</Route>
      <Route path="/terminal" breadcrumb="Terminal">Terminal...</Route>
    </svelte:fragment>
  </DetailsPage>
{/if}
