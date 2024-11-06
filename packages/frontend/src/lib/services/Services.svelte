<script lang="ts">
import { NavPage, Table, TableColumn, TableRow } from '@podman-desktop/ui-svelte';
import { services } from '../../stores/services';
import type { Service } from '/@shared/src/models/Service';
import ColumnName from './ColumnName.svelte';

const columns: TableColumn<Service>[] = [
  new TableColumn<Service>('Name', { width: '1fr', renderer: ColumnName, align: 'left' }),
];
const row = new TableRow<Service>({ selectable: (_service): boolean => true });

</script>

<NavPage title="Services" searchEnabled={false}>
  <div slot="content" class="flex flex-col min-w-full min-h-full">
    <div class="flex min-w-full min-h-full">
      <Table kind="services" data={$services} columns={columns} row={row} />
    </div>
  </div>
</NavPage>
