<script lang="ts">
import { Dropdown, FormPage, Input, Button } from "@podman-desktop/ui-svelte";
import { onMount } from "svelte";
import { router } from "tinro";
import { servicesClient } from "/@/api/client";
import PasswordInput from "../components/PasswordInput.svelte";

let images: { label: string, value: string}[];

let localPort: number = 0;
let imageName: string = '';
let imageVersion: string = 'latest';
let databaseName: string = 'postgres';
let user: string = 'postgres';
let password: string = '';

export function goToUpPage(): void {
  router.goto('/');
}

const onLocalPortInput = (event: Event): void => {
  const raw = (event.target as HTMLInputElement).value;
  try {
    localPort = parseInt(raw);
  } catch (e: unknown) {
    console.warn('invalid value for container port', e);
    localPort = 15432;
  }
};

onMount(async () => {  
  const imgs = await servicesClient.getServiceImages();
  images = Array.from(imgs.keys()).map(a => ({ label: imgs.get(a)  ?? '', value: a }));

  servicesClient
    .getFreePort(5432)
    .then(port => {
      localPort = port;
    })
    .catch((err: unknown) => {
      console.error(err);
    });
});
</script>

<FormPage
  title="Start a PostgreSQL service"
  breadcrumbLeftPart="Services"
  breadcrumbRightPart="Start a PostgreSQL service"
  breadcrumbTitle="Go back to Services"
  onclose={goToUpPage}
  onbreadcrumbClick={goToUpPage}>
  <svelte:fragment slot="icon">
    <i class="fas fa-cube fa-2x" aria-hidden="true"></i>
  </svelte:fragment>
  <svelte:fragment slot="content">

    <div class="p-5 min-w-full h-full">
      <div class="bg-[var(--pd-content-card-bg)] p-6 space-y-2 lg:p-8 rounded-lg">
        <div class="space-y-6">

          <div>
            <label for="imageInput" class="block mb-2 font-semibold text-[var(--pd-content-card-header-text)]"
              >Image</label>

            <div class="flex flex-row items-center">
              <Dropdown name="imageInput" id="imageInput" class="basis-1/2" options={images} bind:value={imageName} />
              <div class="mx-2 ">version</div>
              <Dropdown bind:value={imageVersion}>
                <option value="latest">latest</option>
                <option value="17">17</option>
                <option value="16">16</option>
                <option value="15">15</option>
                <option value="14">14</option>
                <option value="13">13</option>
              </Dropdown>
            </div>
          </div>
        
          <div>
            <label
              for="localPort"
              class="block mb-2 font-semibold text-[var(--pd-content-card-header-text)]">Local port</label>
            <div>
              <Input
                value={String(localPort ?? 0)}
                on:input={onLocalPortInput}
                class="w-full"
                placeholder="5432"
                name="localPort"
                id="localPort"
                aria-label="Port input"
                required />
            </div>
          </div>
        
          <div>
            <label
              for="databaseName"
              class="block mb-2 font-semibold text-[var(--pd-content-card-header-text)]">Database name</label>
            <div>
              <Input
                bind:value={databaseName}
                class="w-full"
                placeholder="postgres"
                name="databaseName"
                id="databaseName"
                aria-label="Database name"
                required />
            </div>
          </div>

          <div class="flex flex-row space-x-4">

            <div class="flex-1">
              <label
                for="userInput"
                class="block mb-2 font-semibold text-[var(--pd-content-card-header-text)]">User</label>
              <div>
                <Input
                  bind:value={user}
                  class="w-full"
                  placeholder="postgres"
                  name="userInput"
                  id="userInput"
                  aria-label="User"
                  required />
              </div>
            </div>

            <div class="flex-1">
              <label
                for="pwdInput"
                class="block mb-2 font-semibold text-[var(--pd-content-card-header-text)]">Password</label>
              <div>
                <PasswordInput
                  bind:value={password}
                  class="w-full"
                  name="pwdInput"
                  id="pwdInput"
                  aria-label="Password"
                  required />
              </div>
            </div>
  
          </div>

          <div class="w-full flex flex-col"><Button>Create service</Button></div>
        </div>
      </div>
    </div>
  </svelte:fragment>
</FormPage>
