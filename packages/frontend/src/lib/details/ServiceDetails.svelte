<script lang="ts">
import { DetailsPage, Tab } from '@podman-desktop/ui-svelte';
import { onMount } from 'svelte';
import { router } from 'tinro';
import { servicesClient } from '/@/api/client';
import type { Service } from '/@shared/src/models/Service';
import { isTabSelected } from '../utils';
import Route from '../Route.svelte';
import Summary from './Summary.svelte';

export let containerId: string;

let service: Service | undefined = undefined;

export function goToUpPage(): void {
  router.goto('/');
}

onMount(async () => {
  try {
    service = await servicesClient.getServiceDetails(containerId);
  } catch (err: unknown) {
    console.debug(err);
    goToUpPage();
  }
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
    {#snippet subtitleSnippet()}
      <div class="flex gap-x-2 items-center text-[var(--pd-content-sub-header)]">
        <span class="text-xs">{service?.name}</span>
      </div>
    {/snippet}
    {#snippet tabsSnippet()}
      <Tab title="Summary" selected={isTabSelected($router.path, 'summary')} url={`${containerId}/summary`} />
    {/snippet}
    {#snippet contentSnippet()}
      {#if service}
        <Route path="/summary" breadcrumb="Summary"><Summary service={service} /></Route>
      {/if}
    {/snippet}
  </DetailsPage>
{/if}
