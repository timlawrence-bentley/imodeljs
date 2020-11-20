/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as React from "react";
import { VirtualTable } from "../virtual-table/VirtualTable";
import { Row } from "react-table";

interface MyData {
  col1: string;
  col2: string;
}

export function ReactTableDemo() {
  const data: MyData[] = React.useMemo(
    () => {
      const tableData: MyData[] = [];
      for (let i = 0; i < 100000; i++) {
        tableData.push({
          col1: `Hello ${i}`,
          col2: `World ${i}`,
        });
      }
      return tableData;
    },
    []
  );

  const columns = React.useMemo(
    () => [
      {
        Header: "Name",
        columns: [
          {
            Header: "Column 1",
            accessor: (originalRow: any) => originalRow.col1, // accessor is the "key" in the data
            id: "col1",
          },
          {
            Header: "Column 2",
            accessor: (originalRow: any) => originalRow.col2,
            id: "col2",
          },
        ],
      },
    ],
    []
  );

  const [selectedRow, setSelectedRow] = React.useState<number | undefined>();

  const onRowClicked = (row: Row<MyData>) => {
    const rowIndex = data.findIndex((value) => value === row.original);
    setSelectedRow(rowIndex);
  };

  return (
    <div style={{ height: "100%" }}>
      <VirtualTable<MyData>
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
