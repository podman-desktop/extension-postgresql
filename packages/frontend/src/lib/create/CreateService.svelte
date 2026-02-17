<script lang="ts">
import { Dropdown, FormPage, Input, Button, Tab, Checkbox, NumberInput } from '@podman-desktop/ui-svelte';
import { onMount } from 'svelte';
import { router } from 'tinro';
import { servicesClient } from '/@/api/client';
import PasswordInput from '../components/PasswordInput.svelte';
import { isTabSelected } from '../utils';
import Route from '../Route.svelte';

let images: { label: string; value: string }[];

const MIN_PORT = 1024;
const MAX_PORT = 49151;

// basic
let serviceName: string = '';
let localPort: number = 0;
let imageName: string = '';
let imageVersion: string = '18';
let databaseName: string = 'postgres';
let user: string = 'postgres';
let password: string = '';

// init scripts
let scripts: { type: 'sql' | 'sh'; name: string; content: string }[] = [];

// PgAdmin
let pgadmin: boolean = false;
let pgadminLocalPort: number;

let valid: boolean = false;
let creating: boolean = false;
let error: string = '';

$: valid = checkValidity(serviceName, imageName, password, localPort, scripts.length, pgadmin, pgadminLocalPort);

function checkValidity(
  serviceName: string,
  imageName: string,
  password: string,
  localPort: number,
  scriptsLength: number,
  pgadin: boolean,
  pgadminLocalPort: number,
) {
  return (
    !!serviceName &&
    !!imageName &&
    !!password &&
    MIN_PORT <= localPort &&
    localPort <= MAX_PORT &&
    (!pgadmin || (MIN_PORT <= pgadminLocalPort && pgadminLocalPort <= MAX_PORT))
  );
}

export function goToUpPage(): void {
  router.goto('/');
}

onMount(async () => {
  const imgs = await servicesClient.getServiceImages();
  images = Array.from(imgs.keys()).map(a => ({ label: imgs.get(a) ?? '', value: a }));
  imageName = images[0].value;

  await servicesClient
    .getFreePort(5432)
    .then(port => {
      localPort = port;
    })
    .catch((err: unknown) => {
      console.error(err);
    });

  await servicesClient
    .getFreePort(8080)
    .then(port => {
      pgadminLocalPort = port;
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
    await servicesClient.createService(serviceName, {
      imageWithTag: imageName + version,
      localPort,
      dbname: databaseName,
      user,
      password,
      scripts: scripts.map(s => ({ name: s.name, content: s.content })),
      pgadmin,
      pgadminLocalPort: pgadmin ? pgadminLocalPort : undefined,
    });
    goToUpPage();
  } catch (err: unknown) {
    error = String(err);
  } finally {
    creating = false;
  }
}

function addScript(type: 'sql' | 'sh') {
  const num = `${scripts.length + 1}`.padStart(2, '0');
  const name = `${num}.${type}`;
  scripts.push({ type, name, content: '' });
  scripts = [...scripts];
}
</script>

<Route path="/*">
  <FormPage
    title="Start a PostgreSQL service"
    breadcrumbLeftPart="Services"
    breadcrumbRightPart="Start a PostgreSQL service"
    onclose={goToUpPage}
    onbreadcrumbClick={goToUpPage}>
    {#snippet icon()}
      <i class="fas fa-cube fa-2x" aria-hidden="true"></i>
    {/snippet}
    {#snippet content()}
      <div class="p-5 min-w-full h-full flex flex-col">
        {#if error}
          <div class="m-4 text-red-600">{error}</div>
        {/if}

        <div class="bg-[var(--pd-content-card-bg)] p-6 space-y-2 lg:p-8 rounded-lg">
          <div class="space-y-6">
            <div class="flex flex-row px-2 border-b border-charcoal-400">
              <Tab title="Basic" selected={isTabSelected($router.path, 'basic')} url={'create/basic'} />
              <Tab title="Init scripts" selected={isTabSelected($router.path, 'scripts')} url={'create/scripts'} />
              <Tab title="PgAdmin" selected={isTabSelected($router.path, 'pgadmin')} url={'create/pgadmin'} />
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
                  <Dropdown
                    name="imageInput"
                    id="imageInput"
                    class="basis-1/2"
                    options={images}
                    bind:value={imageName} />
                  <div class="mx-2">version</div>
                  <Dropdown bind:value={imageVersion}>
                    <option value="18">18</option>
                    <option value="17">17</option>
                    <option value="16">16</option>
                    <option value="15">15</option>
                    <option value="14">14</option>
                    <option value="13">13</option>
                  </Dropdown>
                </div>
              </div>

              <div>
                <label for="localPort" class="block mb-2 font-semibold text-[var(--pd-content-card-header-text)]"
                  >Local port *</label>
                <div>
                  <NumberInput
                    type="integer"
                    minimum={MIN_PORT}
                    maximum={MAX_PORT}
                    bind:value={localPort}
                    name="localPort"
                    aria-label="Port input"
                    required />
                </div>
              </div>

              <div>
                <label for="databaseName" class="block mb-2 font-semibold text-[var(--pd-content-card-header-text)]"
                  >Database name</label>
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
                  <label for="userInput" class="block mb-2 font-semibold text-[var(--pd-content-card-header-text)]"
                    >User</label>
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
                  <label for="pwdInput" class="block mb-2 font-semibold text-[var(--pd-content-card-header-text)]"
                    >Password *</label>
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

            <Route path="/scripts" breadcrumb="Init scripts">
              <div class="flex flex-col space-y-4 w-full">
                {#each scripts as script, i}
                  <div class="flex flex-col space-y-1">
                    <label for={'script_' + script.name}>{script.name}</label>
                    <textarea
                      class="w-full p-2 outline-hidden text-sm bg-[var(--pd-input-field-focused-bg)] rounded-sm text-[var(--pd-input-field-focused-text)] placeholder-[var(--pd-input-field-placeholder-text)]"
                      rows="5"
                      bind:value={scripts[i].content}
                      id={'script_' + script.name}>
                      {script.content}
                    </textarea>
                  </div>
                {/each}
                <div class="flex flex-row space-x-4 justify-end">
                  <Button on:click={() => addScript('sql')}>Add an SQL script</Button>
                  <Button on:click={() => addScript('sh')}>Add a shell script</Button>
                </div>
              </div>
            </Route>

            <Route path="/pgadmin" breadcrumb="PgAdmin">
              <div class="flex flex-col space-y-4 w-full">
                <div class="flex flex-row items-center">
                  <Checkbox bind:checked={pgadmin} class="w-full" name="pgadmin" id="pgadmin" required
                    >Start a container with PgAdmin, in the same Pod, to access the service</Checkbox>
                </div>

                <div>
                  <label
                    for="pgAdminLocalPort"
                    class="block mb-2 font-semibold text-[var(--pd-content-card-header-text)]"
                    >Admin Local port *</label>
                  <div>
                    <NumberInput
                      type="integer"
                      minimum={MIN_PORT}
                      maximum={MAX_PORT}
                      bind:value={pgadminLocalPort}
                      name="pgAdminLocalPort"
                      aria-label="Port input"
                      required
                      disabled={!pgadmin} />
                  </div>
                </div>
              </div>
            </Route>

            <div class="w-full flex flex-col">
              <Button disabled={!valid} inProgress={creating} on:click={createService}>Create service</Button>
            </div>
          </div>
        </div>
      </div>
    {/snippet}
  </FormPage>
</Route>
