/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as React from "react";
import {
  PropertyRecord, PropertyValue,
} from "@bentley/ui-abstract";
import {
  ColumnDescription, PropertyUpdatedArgs, SelectionMode, Table, TableCellContextMenuArgs, TableCellUpdatedArgs, TableDataProvider, TableSelectionTarget,
} from "@bentley/ui-components";
import { BodyText, Toggle } from "@bentley/ui-core";
import { ConfigurableCreateInfo, ConfigurableUiManager, ContentControl } from "@bentley/ui-framework";
import { ReactTableDemo } from "../components/react-table-demo/ReactTableDemo";
import { TableExampleData } from "./TableExampleData";

class TableExampleContentControl extends ContentControl {
  constructor(info: ConfigurableCreateInfo, options: any) {
    super(info, options);

    this.reactNode = <TableExampleContent />;
  }
}

interface TableExampleState {
  dataProvider?: TableDataProvider;
  selectionMode: SelectionMode;
  tableSelectionTarget: TableSelectionTarget;
  selectedIndexes: any[];
  requestedTopRow: number;
  topRow: number;
  filtering: boolean;
  useUtc: boolean;
  useVirtualTable: boolean;
}

class TableExampleContent extends React.Component<{}, TableExampleState>  {
  private _tableData = new TableExampleData();
  public readonly state: Readonly<TableExampleState>;

  constructor(props: any) {
    super(props);

    this.state = {
      selectedIndexes: [],
      selectionMode: SelectionMode.Single,
      tableSelectionTarget: TableSelectionTarget.Row,
      requestedTopRow: 0,
      topRow: 0,
      filtering: true,
      useUtc: false,
      useVirtualTable: false,
    };
  }

  private loadData(useUtc: boolean) {
    this._tableData.loadData(useUtc);
    const dataProvider = this._tableData.dataProvider;
    this.setState({ dataProvider });
  }

  public componentDidMount() {
    this.loadData(this.state.useUtc);
  }

  private _onChangeSelectionMode = (e: React.ChangeEvent<HTMLSelectElement>) => {
    let selectionMode: SelectionMode;

    switch (e.target.value) {
      case "1":
        selectionMode = SelectionMode.Single;
        break;
      case "5":
        selectionMode = SelectionMode.SingleAllowDeselect;
        break;
      case "6":
        selectionMode = SelectionMode.Multiple;
        break;
      case "12":
        selectionMode = SelectionMode.Extended;
        break;
      default: selectionMode = SelectionMode.Single;
    }
    this.setState({ selectionMode });
  };

  private _onChangeTableSelectionTarget = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === "0") {
      this.setState({ tableSelectionTarget: TableSelectionTarget.Row });
      return;
    }

    this.setState({ tableSelectionTarget: TableSelectionTarget.Cell });
  };

  private _updatePropertyRecord(record: PropertyRecord, newValue: PropertyValue): PropertyRecord {
    return record.copyWithNewValue(newValue);
  }

  private _handlePropertyUpdated = async (propertyArgs: PropertyUpdatedArgs, cellArgs: TableCellUpdatedArgs): Promise<boolean> => {
    let updated = false;

    if (propertyArgs.propertyRecord) {
      propertyArgs.propertyRecord = this._updatePropertyRecord(propertyArgs.propertyRecord, propertyArgs.newValue);
      if (cellArgs.rowIndex >= 0) {
        const rowItem = await this.state.dataProvider!.getRow(cellArgs.rowIndex);
        if (rowItem) {
          const cellItem = rowItem.cells.find((cell) => cell.key === cellArgs.cellKey);
          if (cellItem) {
            cellItem.record = propertyArgs.propertyRecord;
            updated = true;
          }
        }
      }
    }

    return updated;
  };

  private _onRequestedTopRowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let requestedTopRow = 0;
    if (e.target.value)
      requestedTopRow = parseInt(e.target.value, 10);
    this.setState({ requestedTopRow });
  };

  private _onScrollToRow = (topRowIndex: number) => {
    this.setState({ topRow: topRowIndex });
  };

  private _handleCellContextMenu = (args: TableCellContextMenuArgs) => {
    // eslint-disable-next-line no-console
    console.log(`rowIndex ${args.rowIndex}, colIndex ${args.colIndex}, cellKey ${args.cellKey}`);
  };

  private _onUtcChange = (checked: boolean) => {
    this.setState({ useUtc: checked });
    this.loadData(checked);
  };

  private _onVirtualTableChange = (checked: boolean) => {
    this.setState({ useVirtualTable: checked });
  };

  private _onFilteringChange = (checked: boolean) => {
    this._tableData.columns.forEach((column: ColumnDescription) => {
      column.filterable = checked;
    });
    if (this.state.dataProvider) {
      this.state.dataProvider.onColumnsChanged.raiseEvent();
      this.state.dataProvider.onRowsChanged.raiseEvent();
    }
  };

  public render(): React.ReactNode {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexFlow: "column" }}>
        <div style={{ marginTop: "3px", marginBottom: "4px" }}>
          <select onChange={this._onChangeSelectionMode} aria-label="Selection Mode">
            <option value={SelectionMode.Single}>Single</option>
            <option value={SelectionMode.SingleAllowDeselect}>SingleAllowDeselect</option>
            <option value={SelectionMode.Multiple}>Multiple</option>
            <option value={SelectionMode.Extended}>Extended</option>
          </select>
          <Gap />
          <select onChange={this._onChangeTableSelectionTarget} aria-label="Selection Target">
            <option value={TableSelectionTarget.Row}>Row</option>
            <option value={TableSelectionTarget.Cell}>Cell</option>
          </select>
          <Gap />
          <label>
            <BodyText>Top row:</BodyText>
            &nbsp;
            <input onChange={this._onRequestedTopRowChange} style={{ width: "100px" }} />
            &nbsp;
            <span>({this.state.topRow})</span>
          </label>
          <Gap />
          <label>
            <BodyText>Filtering:</BodyText>
            &nbsp;
            <Toggle isOn={this.state.filtering} onChange={this._onFilteringChange} title="Filtering" />
          </label>
          <label>
            <BodyText>UTC:</BodyText>
            &nbsp;
            <Toggle isOn={this.state.useUtc} onChange={this._onUtcChange} title="Use UTC in lieu of local time" />
          </label>
          <label>
            <BodyText>Virtual:</BodyText>
            &nbsp;
            <Toggle isOn={this.state.useVirtualTable} onChange={this._onVirtualTableChange} title="Demo virtual table" />
          </label>
        </div>
        <div style={{ flex: "1", height: "calc(100% - 22px)" }}>
          {(this.state.dataProvider && !this.state.useVirtualTable) &&
            <Table
              dataProvider={this.state.dataProvider}
              tableSelectionTarget={this.state.tableSelectionTarget}
              selectionMode={this.state.selectionMode}
              onPropertyUpdated={this._handlePropertyUpdated}
              scrollToRow={this.state.requestedTopRow}
              onScrollToRow={this._onScrollToRow}
              onCellContextMenu={this._handleCellContextMenu}
              stripedRows={true}
            />
          }
          {(this.state.useVirtualTable) &&
            <ReactTableDemo />
          }
        </div>
      </div>
    );
  }
}

function Gap() {
  return (
    <span style={{ paddingLeft: "10px" }} />
  );
}

ConfigurableUiManager.registerControl("TableExampleContent", TableExampleContentControl);
