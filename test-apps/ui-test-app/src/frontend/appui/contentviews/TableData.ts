/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { LoremIpsum } from "lorem-ipsum";
import {
  AlternateDateFormats,
  BasePropertyEditorParams,
  DateFormatter,
  InputEditorSizeParams,
  Primitives,
  PropertyDescription,
  PropertyEditorInfo,
  PropertyEditorParamTypes,
  PropertyRecord,
  PropertyValue,
  PropertyValueFormat,
  RangeEditorParams,
  SliderEditorParams,
  StandardEditorNames,
  StandardTypeNames,
  TimeDisplay,
} from "@bentley/ui-abstract";
import {
  ColumnDescription,
  FilterRenderer,
  LessGreaterOperatorProcessor,
  RowItem,
  SimpleTableDataProvider,
  TableDataProvider,
  TypeConverter,
  TypeConverterManager,
} from "@bentley/ui-components";

const createPropertyRecord = (value: any, column: ColumnDescription, typename: string, editor?: PropertyEditorInfo) => {
  const v: PropertyValue = {
    valueFormat: PropertyValueFormat.Primitive,
    value,
    displayValue: value,
  };
  const pd: PropertyDescription = {
    typename,
    name: column.key,
    displayLabel: column.label,
    editor,
  };
  column.propertyDescription = pd;
  return new PropertyRecord(v, pd);
};

const MmDdYyyyConverterName = "mm-dd-yyyy";

const createDatePropertyRecord = (value: any, column: ColumnDescription, option: number) => {
  const v: PropertyValue = {
    valueFormat: PropertyValueFormat.Primitive,
    value,
  };

  let typename = StandardTypeNames.DateTime;
  let converter: any;

  switch (option) {
    case 0:
      typename = StandardTypeNames.DateTime;
      break;
    case 1:
      typename = StandardTypeNames.ShortDate;
      break;
    case 2:
      typename = StandardTypeNames.DateTime;
      converter = { options: { timeDisplay: TimeDisplay.H24M } }; // DateTime with 24hr time
      break;
    case 3:
      typename = StandardTypeNames.DateTime;
      converter = { options: { timeDisplay: TimeDisplay.H24MS } }; // DateTime with 24hr time
      break;
    case 4:
      typename = StandardTypeNames.DateTime;
      converter = { options: { timeDisplay: TimeDisplay.H12MSC } }; // DateTime with 12hr time
      break;
    case 5:
      typename = StandardTypeNames.ShortDate;
      converter = { name: MmDdYyyyConverterName };
      break;
    case 6:
      typename = StandardTypeNames.DateTime;
      converter = { options: { alternateDateFormat: AlternateDateFormats.IsoDateTime } };
      break;
    case 7:
      typename = StandardTypeNames.ShortDate;
      converter = { options: { alternateDateFormat: AlternateDateFormats.IsoShort } };
      break;
    case 8:
      typename = StandardTypeNames.ShortDate;
      converter = { options: { alternateDateFormat: AlternateDateFormats.UtcShort } };
      break;
    case 9:
      typename = StandardTypeNames.ShortDate;
      converter = { options: { alternateDateFormat: AlternateDateFormats.UtcShortWithDay } };
      break;
    case 10:
      typename = StandardTypeNames.DateTime;
      converter = { options: { alternateDateFormat: AlternateDateFormats.UtcDateTime } };
      break;
    case 11:
      typename = StandardTypeNames.DateTime;
      converter = { options: { alternateDateFormat: AlternateDateFormats.UtcDateTimeWithDay } };
      break;
  }

  const pd: PropertyDescription = {
    typename, // ShortDate | DateTime
    converter,
    name: column.key,
    displayLabel: column.label,
  };
  column.propertyDescription = pd;
  return new PropertyRecord(v, pd);
};

const createEnumPropertyRecord = (rowIndex: number, column: ColumnDescription) => {
  const value = rowIndex % 4;
  const v: PropertyValue = {
    valueFormat: PropertyValueFormat.Primitive,
    value,
    displayValue: value.toString(),
  };
  const pd: PropertyDescription = {
    typename: StandardTypeNames.Enum,
    name: column.key,
    displayLabel: column.label,
  };
  column.propertyDescription = pd;
  const enumPropertyRecord = new PropertyRecord(v, pd);
  enumPropertyRecord.property.enum = { choices: [], isStrict: false };
  enumPropertyRecord.property.enum.choices = [
    { label: "Yellow", value: 0 },
    { label: "Red", value: 1 },
    { label: "Green", value: 2 },
    { label: "Blue", value: 3 },
  ];
  return enumPropertyRecord;
};

const createLoremPropertyRecord = (column: ColumnDescription) => {
  const lorem = new LoremIpsum();
  const value = lorem.generateWords(5);

  const v: PropertyValue = {
    valueFormat: PropertyValueFormat.Primitive,
    value,
    displayValue: value,
  };

  const editorParams: BasePropertyEditorParams[] = [];
  const inputSizeParams: InputEditorSizeParams = {
    type: PropertyEditorParamTypes.InputEditorSize,
    size: 30,
  };
  editorParams.push(inputSizeParams);

  const pd: PropertyDescription = {
    typename: StandardTypeNames.Text,
    name: column.key,
    displayLabel: column.label,
    editor: { name: StandardEditorNames.MultiLine, params: editorParams },
  };
  column.propertyDescription = pd;
  return new PropertyRecord(v, pd);
};

/**
 * Data for Table demos
 */
export class TableData {
  private _dataProvider?: TableDataProvider;

  private _columns: ColumnDescription[] = [
    {
      key: "id",
      label: "ID",
      resizable: true,
      sortable: true,
      width: 90,
      editable: true,
      filterable: true,
      filterRenderer: FilterRenderer.Numeric,
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
      resizable: true,
      editable: true,
      filterable: true,
      filterRenderer: FilterRenderer.MultiSelect,
    },
    {
      key: "title",
      label: "Title",
      sortable: true,
      resizable: true,
      editable: true,
      filterable: true,
      filterRenderer: FilterRenderer.MultiSelect,
    },
    {
      key: "color",
      label: "Color",
      sortable: true,
      resizable: true,
      editable: true,
      width: 180,
      filterable: true,
      filterRenderer: FilterRenderer.SingleSelect,
    },
    {
      key: "lorem",
      label: "Lorem",
      resizable: true,
      editable: true,
      filterable: true,
      filterRenderer: FilterRenderer.Text,
    },
  ];

  public get dataProvider(): TableDataProvider | undefined { return this._dataProvider; }
  public get columns(): ColumnDescription[] { return this._columns; }

  public loadData(useUtc: boolean) {
    const editorParams: BasePropertyEditorParams[] = [];
    const sliderParams: SliderEditorParams = {
      type: PropertyEditorParamTypes.Slider,
      minimum: 1,
      maximum: 100,
      step: 1,
      showTooltip: true,
      tooltipBelow: true,
    };
    const rangeParams: RangeEditorParams = {
      type: PropertyEditorParamTypes.Range,
      minimum: 1,
      maximum: 100,
    };
    editorParams.push(sliderParams);
    editorParams.push(rangeParams);

    const rows = new Array<RowItem>();
    for (let i = 1; i <= 1000 /* 00 */; i++) {
      const row: RowItem = { key: i.toString(), cells: [] };
      row.cells.push({
        key: this._columns[0].key,
        record: createPropertyRecord(i, this._columns[0], StandardTypeNames.Int, { name: StandardEditorNames.Slider, params: editorParams }),
      });
      const monthValue = i % 12;
      const dayValue = i % 28;
      const day = new Date();
      if (useUtc) {
        day.setUTCFullYear(2019, monthValue, dayValue);
        day.setUTCHours(0, 0, 0, 0);
      } else {
        day.setFullYear(2019, monthValue, dayValue);
        day.setHours(0, 0, 0, 0);
      }
      row.cells.push({
        key: this._columns[1].key,
        record: createDatePropertyRecord(day, this._columns[1], (i - 1) % 12), // 12 different options (0-11)
      });
      row.cells.push({
        key: this._columns[2].key,
        record: createPropertyRecord(`Title ${i}`, this._columns[2], StandardTypeNames.String),
      });
      row.cells.push({
        key: this._columns[3].key,
        record: createEnumPropertyRecord(i, this._columns[3]),
      });
      row.cells.push({
        key: this._columns[4].key,
        record: createLoremPropertyRecord(this._columns[4]),
      });
      rows.push(row);
    }

    const dataProvider = new SimpleTableDataProvider(this._columns);
    dataProvider.setItems(rows);

    this._dataProvider = dataProvider;
  }

}

/** An example formatter that both formats and parses dates. */
class MdyFormatter implements DateFormatter {
  private _formatter = new Intl.DateTimeFormat(undefined,
    {
      year: "numeric",    /* "2-digit", "numeric" */
      month: "2-digit",   /* "2-digit", "numeric", "narrow", "short", "long" */
      day: "2-digit",     /* "2-digit", "numeric" */
    });

  public formateDate(date: Date) {
    const formatParts = this._formatter.formatToParts(date);
    const month = formatParts.find((part) => part.type === "month")!.value;
    const day = formatParts.find((part) => part.type === "day")!.value;
    const year = formatParts.find((part) => part.type === "year")!.value;
    return `${month}-${day}-${year}`;
  }

  public parseDate(dateString: string) {
    const mdy = dateString.split("-").filter((value) => !!value);
    if (mdy.length !== 3) return undefined;
    const month = parseInt(mdy[0], 10);
    const day = parseInt(mdy[1], 10);
    const year = parseInt(mdy[2], 10);

    // validate
    if (isNaN(month) || month < 0 || month > 12) return undefined;
    if (isNaN(day) || day < 0 || day > 31) return undefined;
    if (isNaN(year) || year < 1800 || year > 2300) return undefined;

    return new Date(year, month - 1, day);
  }
}

/**
 * Custom Date Time Type Converter.
 */
class MmDdYyyDateTypeConverter extends TypeConverter implements LessGreaterOperatorProcessor {
  private _formatter = new MdyFormatter();

  public convertToString(value?: Primitives.Value) {
    if (value === undefined)
      return "";

    if (typeof value === "string")
      value = new Date(value);

    if (value instanceof Date) {
      return this._formatter.formateDate(value);
    }

    return value.toString();
  }


  public convertFromString(value: string) {
    if (!value)
      return undefined;

    return this._formatter.parseDate(value);
  }

  public get isLessGreaterType(): boolean { return true; }

  public sortCompare(valueA: Date, valueB: Date, _ignoreCase?: boolean): number {
    return valueA.valueOf() - valueB.valueOf();
  }

  public isEqualTo(valueA: Date, valueB: Date): boolean {
    return valueA.valueOf() === valueB.valueOf();
  }

  public isNotEqualTo(valueA: Date, valueB: Date): boolean {
    return valueA.valueOf() !== valueB.valueOf();
  }

  public isLessThan(a: Date, b: Date): boolean {
    return a.valueOf() < b.valueOf();
  }

  public isLessThanOrEqualTo(a: Date, b: Date): boolean {
    return a.valueOf() <= b.valueOf();
  }

  public isGreaterThan(a: Date, b: Date): boolean {
    return a.valueOf() > b.valueOf();
  }

  public isGreaterThanOrEqualTo(a: Date, b: Date): boolean {
    return a.valueOf() >= b.valueOf();
  }
}

TypeConverterManager.registerConverter(StandardTypeNames.ShortDate, MmDdYyyDateTypeConverter, MmDdYyyyConverterName);
