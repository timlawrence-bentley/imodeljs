/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as React from "react";
import { VirtualTable } from "../virtual-table/VirtualTable";
import { Column, Row } from "react-table";
import { TableExampleData } from "../../contentviews/TableExampleData";
import { TableDataProviderAdapter } from "../virtual-table/TableDataProviderAdapter";
import { RowItem } from "@bentley/ui-components";

interface MyData {
  col1: string;
  col2: string;
}

export function ReactTableDemo() {
  // const data: MyData[] = React.useMemo(
  //   () => {
  //     const tableData: MyData[] = [];
  //     for (let i = 0; i < 100000; i++) {
  //       tableData.push({
  //         col1: `Hello ${i}`,
  //         col2: `World ${i}`,
  //       });
  //     }
  //     return tableData;
  //   },
  //   []
  // );

  // const columns = React.useMemo(
  //   () => [
  //     {
  //       Header: "Name",
  //       columns: [
  //         {
  //           Header: "Column 1",
  //           accessor: (originalRow: any) => originalRow.col1, // accessor is the "key" in the data
  //           id: "col1",
  //         },
  //         {
  //           Header: "Column 2",
  //           accessor: (originalRow: any) => originalRow.col2,
  //           id: "col2",
  //         },
  //       ],
  //     },
  //   ],
  //   []
  // );

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
        setFetchedColumns(providerAdapter.current.reactTableColumns);
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
