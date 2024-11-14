<script lang="ts">
import { Dropdown, FormPage, Input, Button, Tab } from "@podman-desktop/ui-svelte";
import { onMount } from "svelte";
import { router } from "tinro";
import { servicesClient } from "/@/api/client";
import PasswordInput from "../components/PasswordInput.svelte";
import NumberInput from "../components/NumberInput.svelte";
import { isTabSelected } from "../utils";
import Route from "../Route.svelte";

let images: { label: string, value: string}[];

const MIN_PORT=1024;
const MAX_PORT=49151;

let serviceName: string = '';
let localPort: number = 0;
let imageName: string = '';
let imageVersion: string = '17';
let databaseName: string = 'postgres';
let user: string = 'postgres';
let password: string = '';

let valid: boolean = false;
let creating: boolean = false;
let error: string = '';

$: valid = checkValidity(serviceName, imageName, password, localPort);

function checkValidity(serviceName: string, imageName: string, password: string, localPort: number) {
  return !!serviceName && !!imageName && !!password && MIN_PORT <= localPort && localPort <= MAX_PORT;
}

export function goToUpPage(): void {
  router.goto('/');
}

onMount(async () => {  
  const imgs = await servicesClient.getServiceImages();
  images = Array.from(imgs.keys()).map(a => ({ label: imgs.get(a)  ?? '', value: a }));
  imageName = images[0].value;

  servicesClient
    .getFreePort(5432)
    .then(port => {
      localPort = port;
    })
    .catch((err: unknown) => {
      console.error(err);
    });
});

async function createService() {
  creating = true;
  error = '';
  // TODO use getImageTags when available in API
  let version = imageVersion;
  if (imageName === 'docker.io/pgvector/pgvector:') {
    version = `pg${version}`;
  }
  try {
    await servicesClient.createService(serviceName, imageName+version, localPort, databaseName, user, password);
    goToUpPage();
  } catch (err: unknown) {
    error = String(err);
  } finally {
    creating = false;
  }
}
</script>

<Route path="/*">

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
  
      <div class="p-5 min-w-full h-full flex flex-col">
      
        {#if error}
          <div class="m-4 text-red-600">{error}</div>  
        {/if}
      
        <div class="bg-[var(--pd-content-card-bg)] p-6 space-y-2 lg:p-8 rounded-lg">
          <div class="space-y-6">
          
            <div class="flex flex-row px-2 border-b border-charcoal-400">
              <Tab title="Basic" selected={isTabSelected($router.path, 'basic')} url={'create/basic'} />
              <Tab
                title="Init scripts"
                selected={isTabSelected($router.path, 'scripts')}
                url={'create/scripts'} />
            </div>
          
            <Route path="/basic" breadcrumb="Basic">
            
              <div>
                <label for="nameInput" class="block mb-2 font-semibold text-[var(--pd-content-card-header-text)]"
                  >Name *</label>
              
                <div class="flex flex-row items-center">
                  <Input
                    bind:value={serviceName}
                    class="w-full"
                    placeholder="my-service"
                    name="serviceName"
                    id="serviceName"
                    aria-label="Service name"
                    required />
                </div>
              </div>
            
              <div>
                <label for="imageInput" class="block mb-2 font-semibold text-[var(--pd-content-card-header-text)]"
                  >Image *</label>
              
                <div class="flex flex-row items-center">
                  <Dropdown name="imageInput" id="imageInput" class="basis-1/2" options={images} bind:value={imageName} />
                  <div class="mx-2 ">version</div>
                  <Dropdown bind:value={imageVersion}>
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
                  class="block mb-2 font-semibold text-[var(--pd-content-card-header-text)]">Local port *</label>
                <div>
                  <NumberInput
                    type="integer"
                    minimum={MIN_PORT}
                    maximum={MAX_PORT}
                    bind:value={localPort}
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
                    placeholder="'postgres' by default"
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
                      placeholder="'postgres' by default"
                      name="userInput"
                      id="userInput"
                      aria-label="User"
                      required />
                  </div>
                </div>
              
                <div class="flex-1">
                  <label
                    for="pwdInput"
                    class="block mb-2 font-semibold text-[var(--pd-content-card-header-text)]">Password *</label>
                  <div>
                    <PasswordInput
                      bind:password={password}
                      class="w-full"
                      name="pwdInput"
                      id="pwdInput"
                      aria-label="Password"
                      required />
                  </div>
                </div>
              
              </div>
            </Route>
          
            <div class="w-full flex flex-col"><Button disabled={!valid} inProgress={creating} on:click={createService}>Create service</Button></div>
          </div>
        </div>
      </div>
    </svelte:fragment>
  </FormPage>
</Route>