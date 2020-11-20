/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import classnames from "classnames";
import * as React from "react";
import {
  Row,
  SortingRule,
  TableOptions,
  useFlexLayout,
  useRowSelect,
  useTable,
} from "react-table";
import AutoSizer, { Size } from "react-virtualized-auto-sizer";
import { FixedSizeList, ListChildComponentProps } from "react-window";
import InfiniteLoader from "react-window-infinite-loader";

import "./VirtualTable.scss";

// cSpell:ignore resetload

export interface FilterParams {
  filter: string;
  orderBy: string | undefined;
}

export interface Table<T extends object = {}> extends TableOptions<T> {
  // is there a page loading
  isNextPageLoading: boolean;
  // are there still more items to load?
  hasNextPage: boolean;
  // Callback function that knows how to load more items
  loadMoreItems: (startIndex: number, stopIndex: number) => Promise<any>;
  // Callback function when an Issue is clicked
  onRowClick: (row: Row<T>) => void;
  // selected row
  selectedRow: number | undefined;
  // reset the data (we clear the cache during things like sorting, filtering, etc.)
  reset: boolean;
  // current query filter
  filterParams?: FilterParams;
  onSortChanged?: (id: string, sortDesc?: boolean) => void;
  columnSortBy?: Array<SortingRule<T>>;
}

/** Basic themed react-table v7
 * @beta
 */
export function VirtualTable<T extends object>(
  props: React.PropsWithChildren<Table<T>>
): React.ReactElement {
  const {
    columns,
    onRowClick,
    selectedRow,
    loadMoreItems,
    hasNextPage,
    isNextPageLoading,
    reset,
    filterParams,
    columnSortBy,
    onSortChanged,
  } = props;

  // initialize selection
  const ids: Record<string, boolean> = {};
  if (selectedRow !== undefined) {
    ids[selectedRow.toString()] = true;
  }

  const instance = useTable<T>(
    {
      ...props,
      columns,
      autoResetSelectedRows: true,
      autoResetSortBy: false,
      disableSortRemove: true,
      initialState: {
        selectedRowIds: ids,
      },
    },
    useRowSelect,
    useFlexLayout
  );

  const {
    getTableProps,
    rows,
    headerGroups,
    toggleAllRowsSelected,
    getTableBodyProps,
    prepareRow,
    selectedFlatRows,
  } = instance;

  const infiniteLoaderRef = React.useRef(null);
  const hasMountedRef = React.useRef(false);

  // Each time the sort prop changed we called the method resetloadMoreItemsCache to clear the cache
  React.useEffect(() => {
    if (infiniteLoaderRef.current && hasMountedRef.current) {
      (infiniteLoaderRef.current as any).resetloadMoreItemsCache(reset);
    }
    hasMountedRef.current = true;
  }, [filterParams, reset]);

  // We manage row selection ourselves since we modify row selection outside of the table (prev/next buttons in Issue panel)
  React.useEffect(() => {
    if (
      selectedFlatRows.length > 0 &&
      Number(selectedFlatRows[0].id) !== selectedRow
    ) {
      toggleAllRowsSelected(false);
    }
    if (selectedRow !== undefined) {
      const row = rows[selectedRow];
      if (row && !row.isSelected) {
        row.toggleRowSelected(true);
      }
    }
  }, [rows, selectedRow, selectedFlatRows, toggleAllRowsSelected]);

  // if there are additional pages, add one for the skeleton row
  const count = hasNextPage ? rows.length + 1 : rows.length;
  // if a page is loading, halt scrolling
  const moreItems = isNextPageLoading ? () => null : loadMoreItems;
  // the item is loaded if either (1) there are no more pages or (2) there exists an item at that index
  const isItemLoaded = (index: number) => !hasNextPage || index < rows.length;

  const getStyle = (align: "left" | "right" | "center" | undefined) => {
    return {
      justifyContent:
        align === "right"
          ? "flex-end"
          : align === "center"
            ? "center"
            : "flex-start",
      display: "flex",
    };
  };

  const renderRow = (p: ListChildComponentProps) => {
    const { index, style } = p;

    const row = rows[index];
    if (!row) {
      if (rows.length === 0) {
        return <div />;
      }
      return <div className={"themedTableTrSkeleton"} style={style} />;
    }

    prepareRow(row);
    return (
      <div
        className={classnames(
          "themedTableTr",
          row.isSelected && "themedTableTrSelected"
        )}
        {...row.getRowProps({ style })}
        onClick={() => onRowClick(row)}
      >
        {row.cells.map((cell) => {
          return (
            <div
              className={"themedTableTd"}
              {...cell.getCellProps({ style: getStyle(cell.column.align) })}
              key={
                cell.column.id ??
                cell.getCellProps({ style: getStyle(cell.column.align) }).key
              }
            >
              {cell.render("Cell")}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={"components-themedTableContainer"}>
      <div className={"themedTable"} {...getTableProps()}>
        <div>
          {headerGroups.map((headerGroup, i: number) => (
            <div
              className={"themedTableHr"}
              {...headerGroup.getHeaderGroupProps()}
              key={i ?? headerGroup.getHeaderGroupProps().key}
            >
              {headerGroup.headers.map((column) => {
                const isSorted = columnSortBy
                  ? columnSortBy[0].id === column.id
                  : false;
                const isSortedDesc = columnSortBy
                  ? columnSortBy[0].desc
                  : false;
                return (
                  <div
                    className={classnames(
                      "themedTableTh",
                      "styledTableHeaderCellSticky",
                      isSorted && "styledTableHeaderCellSorted"
                    )}
                    {...column.getHeaderProps({
                      style: getStyle(column.align),
                    })}
                    key={
                      column.id ??
                      column.getHeaderProps({
                        style: getStyle(column.align),
                      }).key
                    }
                    onClick={() => onSortChanged?.(column.id, isSortedDesc)}
                  >
                    <div>
                      {column.render("Header")}
                      {/* Add a sort direction indicator */}
                      {isSorted && (
                        <span
                          className={classnames(
                            "sortIndicator",
                            isSortedDesc
                              ? "icon icon-sort-down"
                              : "icon icon-sort-up"
                          )}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className={"themedTableTbody"} {...getTableBodyProps()}>
          <AutoSizer>
            {({ width, height }: Size) => (
              <InfiniteLoader
                ref={infiniteLoaderRef}
                isItemLoaded={isItemLoaded}
                itemCount={count}
                loadMoreItems={moreItems}
                threshold={10}
              >
                {({ onItemsRendered, ref }) => (
                  <FixedSizeList
                    height={height}
                    width={width}
                    itemCount={count}
                    itemSize={40}
                    onItemsRendered={onItemsRendered}
                    ref={ref}
                  >
                    {renderRow}
                  </FixedSizeList>
                )}
              </InfiniteLoader>
            )}
          </AutoSizer>
        </div>
      </div>
    </div>
  );
}
