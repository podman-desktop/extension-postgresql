<script lang="ts">
import { NavPage, Table, TableColumn, TableRow, Button } from '@podman-desktop/ui-svelte';
import { services } from '../../stores/services';
import type { Service } from '/@shared/src/models/Service';
import ColumnName from './ColumnName.svelte';
import ColumnImageName from './ColumnImageName.svelte';
import ColumnCredentials from './ColumnCredentials.svelte';
import ColumnDatabase from './ColumnDatabase.svelte';
import ColumnAddress from './ColumnAddress.svelte';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import { router } from 'tinro';
import ColumnStatus from './ColumnStatus.svelte';
import ColumnPgadmin from './ColumnPgadmin.svelte';

const columns: TableColumn<Service>[] = [
  new TableColumn<Service>('Status', { width: '70px', renderer: ColumnStatus, align: 'center' }),
  new TableColumn<Service>('Name', { width: '2fr', renderer: ColumnName, align: 'left' }),
  new TableColumn<Service>('Image', { width: '2fr', renderer: ColumnImageName, align: 'left' }),
  new TableColumn<Service>('Address', { width: '1fr', renderer: ColumnAddress, align: 'left' }),
  new TableColumn<Service>('Database', { width: '1fr', renderer: ColumnDatabase, align: 'left' }),
  new TableColumn<Service>('Credentials', { width: '1fr', renderer: ColumnCredentials, align: 'left' }),
  new TableColumn<Service>('PgAdmin', { width: '1fr', renderer: ColumnPgadmin, align: 'left' }),
      ];
const row = new TableRow<Service>({ selectable: (_service): boolean => true });

function createNewService(): void {
  router.goto('/create/basic');
}
</script>

<NavPage title="Services" searchEnabled={false}>
  <svelte:fragment slot="additional-actions">
    <Button icon={faPlusCircle} title="Create a new service" on:click={createNewService}>New Service</Button>
  </svelte:fragment>
  <div slot="content" class="flex flex-col min-w-full min-h-full">
    <div class="flex min-w-full min-h-full">
      <Table kind="services" data={$services} columns={columns} row={row} />
    </div>
  </div>
</NavPage>
