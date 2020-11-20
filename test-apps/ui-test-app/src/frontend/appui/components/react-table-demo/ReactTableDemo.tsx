/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as React from "react";
import { Column, Row } from "react-table";

import { RowItem } from "@bentley/ui-components";

import { TableExampleData } from "../../contentviews/TableExampleData";
import { VirtualTable } from "../virtual-table/VirtualTable";
import { TableDataProviderAdapter } from "../virtual-table/TableDataProviderAdapter";

export function ReactTableDemo() {
  const tableExampleData = React.useMemo(() => new TableExampleData(), []);
  const providerAdapter = React.useRef<TableDataProviderAdapter>();
  const [fetchedData, setFetchedData] = React.useState<RowItem[]>();
  const [fetchedColumns, setFetchedColumns] = React.useState<Column<RowItem>[]>();
  const isMounted = React.useRef(false);

  React.useEffect(() => {
    isMounted.current = true;
    async function fetchData() {
      tableExampleData.loadData(false);
      const dataProvider = tableExampleData.dataProvider;
      providerAdapter.current = new TableDataProviderAdapter(dataProvider!);
      await providerAdapter.current.adapt();
      if (isMounted.current) {
        setFetchedData(providerAdapter.current.reactTableData);
        setFetchedColumns(
          [
            {
              Header: "columns",
              columns: providerAdapter.current.reactTableColumns,
            },
          ]
        );
      }
    }
    fetchData(); // eslint-disable-line @typescript-eslint/no-floating-promises
  }, [tableExampleData, setFetchedData, setFetchedColumns]);

  // runs returned function only when component is unmounted.
  React.useEffect(() => {
    return (() => {
      isMounted.current = false;
    });
  }, []);

  const [selectedRow, setSelectedRow] = React.useState<number | undefined>();

  const data = fetchedData ? fetchedData : [];
  const columns = fetchedColumns ? fetchedColumns : [];

  const onRowClicked = (row: Row<RowItem>) => {
    const rowIndex = data.findIndex((value) => value === row.original);
    setSelectedRow(rowIndex);
  };

  return (
    <div style={{ height: "100%" }}>
      <VirtualTable<RowItem>
        columns={columns}
        data={data}
        isNextPageLoading={false}
        hasNextPage={false}
        loadMoreItems={async () => null}
        onRowClick={onRowClicked}
        reset={false}
        selectedRow={selectedRow}
      />
    </div>
  );
}
