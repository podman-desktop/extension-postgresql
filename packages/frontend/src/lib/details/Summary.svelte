<script lang="ts">
import type { Service } from '/@shared/src/models/Service';
import { servicesClient } from '/@/api/client';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { Fa } from 'svelte-fa';

export let service: Service;

let kvString: { obfuscated: string; clear: string };
let uriString: { obfuscated: string; clear: string };
let kvClear: boolean = false;
let uriClear: boolean = false;

$: getStrings(service);

async function getStrings(service: Service) {
  const strings = await servicesClient.getConnectionStrings(service.containerId);
  kvString = strings.kv;
  uriString = strings.uri;
}
</script>

{#if service}
  <div class="h-full overflow-y-auto bg-[var(--pd-content-bg)]">
    <div class="mt-4 px-5 space-y-5">
      <!-- connection strings -->
      <div>
        <!-- title -->
        <div class="flex flex-row">
          <span class="text-base grow text-[var(--pd-content-card-text)]">Connection strings</span>
        </div>

        <div class="bg-[var(--pd-content-card-bg)] rounded-md w-full px-4 pt-3 pb-4 mt-2 flex flex-col gap-y-4">
          <span class="text-sm text-[var(--pd-content-card-text)]">Keyword/value string</span>
          <div class="flex flex-row space-x-2">
            <div
              class="bg-[var(--pd-label-bg)] text-[var(--pd-label-text)] rounded-md p-2 flex flex-row w-min h-min text-xs text-nowrap items-center">
              {kvClear ? kvString?.clear : kvString?.obfuscated}
            </div>
            <button
              on:click={() => {
                kvClear = !kvClear;
              }}><Fa icon={kvClear ? faEyeSlash : faEye} /></button>
          </div>

          <span class="text-sm text-[var(--pd-content-card-text)]">URI string</span>
          <div class="flex flex-row space-x-2">
            <div
              class="bg-[var(--pd-label-bg)] text-[var(--pd-label-text)] rounded-md p-2 flex flex-row w-min h-min text-xs text-nowrap items-center">
              {uriClear ? uriString?.clear : uriString?.obfuscated}
            </div>
            <button
              on:click={() => {
                uriClear = !uriClear;
              }}><Fa icon={uriClear ? faEyeSlash : faEye} /></button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
