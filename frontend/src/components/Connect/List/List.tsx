import React from 'react';
import useAppParams from 'lib/hooks/useAppParams';
import { ClusterNameRoute } from 'lib/paths';
import Table, { TagCell } from 'components/common/NewTable';
import { FullConnectorInfo } from 'generated-sources';
import { useConnectors } from 'lib/hooks/api/kafkaConnect';
import { ColumnDef } from '@tanstack/react-table';
import { useSearchParams } from 'react-router-dom';
import { useQueryPersister } from 'components/common/NewTable/ColumnFilter';
import { useLocalStoragePersister } from 'components/common/NewTable/ColumnResizer/lib';
import BreakableTextCell from 'components/common/NewTable/BreakableTextCell';
import ResourcePageHeading from 'components/common/ResourcePageHeading/ResourcePageHeading';
import { Button } from 'components/common/Button/Button';

import ActionsCell from './ActionsCell';
import TopicsCell from './TopicsCell';
import RunningTasksCell from './RunningTasksCell';
import { KafkaConnectLinkCell } from './KafkaConnectLinkCell';

const kafkaConnectColumns: ColumnDef<FullConnectorInfo, string>[] = [
  {
    header: 'Name',
    accessorKey: 'name',
    cell: KafkaConnectLinkCell,
    enableResizing: true,
  },
  {
    header: 'Connect',
    accessorKey: 'connect',
    cell: BreakableTextCell,
    filterFn: 'arrIncludesSome',
    meta: {
      filterVariant: 'multi-select',
    },
    enableResizing: true,
  },
  {
    header: 'Type',
    accessorKey: 'type',
    meta: { filterVariant: 'multi-select' },
    filterFn: 'arrIncludesSome',
    size: 120,
  },
  {
    header: 'Plugin',
    accessorKey: 'connectorClass',
    cell: BreakableTextCell,
    meta: { filterVariant: 'multi-select' },
    filterFn: 'arrIncludesSome',
    enableResizing: true,
  },
  {
    header: 'Topics',
    accessorKey: 'topics',
    cell: TopicsCell,
    enableColumnFilter: true,
    meta: { filterVariant: 'multi-select' },
    filterFn: 'arrIncludesSome',
    enableResizing: true,
  },
  {
    header: 'Status',
    accessorKey: 'status.state',
    cell: TagCell,
    meta: { filterVariant: 'multi-select' },
    filterFn: 'arrIncludesSome',
  },
  {
    id: 'running_task',
    header: 'Running Tasks',
    cell: RunningTasksCell,
    size: 120,
  },
  {
    header: '',
    id: 'action',
    cell: ActionsCell,
    size: 60,
  },
];

const List: React.FC = () => {
  const { clusterName } = useAppParams<ClusterNameRoute>();
  const [searchParams] = useSearchParams();
  const { data: connectors } = useConnectors(
    clusterName,
    searchParams.get('q') || ''
  );

  const filterPersister = useQueryPersister(kafkaConnectColumns);
  const columnSizingPersister = useLocalStoragePersister('KafkaConnect');

  const handleExportBulk = async () => {
  if (!connectors?.length) {
    console.warn('No connectors found to export.');
    return;
  }

  const rows: string[] = ['name,config'];

  for (const connector of connectors) {
    try {
      const res = await fetch(
        `/api/clusters/${clusterName}/connects/${connector.connect}/connectors/${connector.name}/config`
      );
      const config = await res.json();

      // Escape double quotes in JSON config
      const configString = JSON.stringify(config).replace(/"/g, '""');
      const csvRow = `${connector.name},"${configString}"`;
      rows.push(csvRow);
    } catch (e) {
      console.error(`Failed to fetch config for ${connector.name}`, e);
    }
  }

  const csvContent = rows.join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'connectors.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};


  return (
    <>
      <ResourcePageHeading text="Connectors">
        <Button buttonType="secondary" buttonSize="M" onClick={handleExportBulk}>
          Export Bulk
        </Button>
      </ResourcePageHeading>

      <Table
        data={connectors || []}
        columns={kafkaConnectColumns}
        enableSorting
        enableColumnResizing
        columnSizingPersister={columnSizingPersister}
        emptyMessage="No connectors found"
        setRowId={(originalRow) => `${originalRow.name}-${originalRow.connect}`}
        filterPersister={filterPersister}
      />
    </>
  );
};

export default List;
