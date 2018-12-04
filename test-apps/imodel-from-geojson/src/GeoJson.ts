/*---------------------------------------------------------------------------------------------
* Copyright (c) 2018 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
import * as fs from "fs-extra";
import * as path from "path";

/** Class that loads GeoJSON data from an input file. */
export class GeoJson {
  public readonly data: any;
  public readonly title: string;
  public constructor(inputFileName: string) {
    this.data = JSON.parse(fs.readFileSync(inputFileName, "utf8"));
    this.title = path.parse(inputFileName).name;
    if (!Array.isArray(this.data.features)) {
      throw new Error("Invalid GeoJSON");
    }
  }
}

/** Constants associated with GeoJson. */
export namespace GeoJson {
  export type Geometry = any;
  export type Polygon = any;
  export type LineString = any;

  export const enum GeometryType {
    multiPolygon = "MultiPolygon",
  }
}
