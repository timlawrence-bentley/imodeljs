/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2017 Bentley Systems, Incorporated. All rights reserved. $
*--------------------------------------------------------------------------------------------*/
import { Id64 } from "@bentley/bentleyjs-core/lib/Id";
import { Point3d, Point2d } from "@bentley/geometry-core/lib/PointVector";
import { EntityProps } from "../common/EntityProps";
import { IModel } from "../common/IModel";
import { ClassRegistry } from "./ClassRegistry";
import { IModelDb } from "./IModelDb";
import { Schema } from "./Schema";

/** The primitive types of an Entity property. */
export const enum PrimitiveTypeCode {
  Uninitialized = 0x00,
  Binary = 0x101,
  Boolean = 0x201,
  DateTime = 0x301,
  Double = 0x401,
  Integer = 0x501,
  Long = 0x601,
  Point2d = 0x701,
  Point3d = 0x801,
  String = 0x901,
}

/** the constructor for an Entity. Must have a static member named schema and a ctor that accepts either an EntityProp or an Entity (for cloning). */
export interface EntityCtor extends FunctionConstructor {
  schema: Schema;
  new(args: EntityProps | Entity): Entity;
}

/** a callback function to process properties of an Entity */
export type PropertyCallback = (name: string, meta: PropertyMetaData) => void;

/** Base class for all Entities. */
export class Entity implements EntityProps {
  private persistent: boolean = false;

  /** @hidden */
  public setPersistent() { this.persistent = true; Object.freeze(this); } // Internal use only

  [propName: string]: any;

  /** The schema that defines this class. */
  public static schema: Schema;

  /** The IModel that contains this Entity */
  public iModel: IModel;

  /** The Id of this Entity. Valid only if persistent. */
  public id: Id64;

  constructor(props: EntityProps) {
    this.iModel = props.iModel;
    // copy all auto-handled properties from input to the object being constructed
    this.forEachProperty((propName: string, meta: PropertyMetaData) => this[propName] = meta.createProperty(props[propName]));
  }

  public toJSON() {
    const val: any = {};
    val.classFullName = this.classFullName;
    this.forEachProperty((propName: string) => val[propName] = this[propName]);
    return val;
  }

  /** call a function for each property of this Entity. Function arguments are property name and property metadata. */
  public forEachProperty(func: PropertyCallback, includeCustom: boolean = false) { EntityMetaData.forEach(this.iModel as IModelDb, this.classFullName, true, func, includeCustom); } // WIP

  /** STATIC method to get the full name of this class, in the form "schema.class"  */
  public static get sqlName() { return this.schema.name + "." + this.name; }

  /** get full class name of this Entity in the form "schema:class". */
  public get classFullName(): string { return this.schemaName + ":" + this.className; }

  /** Get the name of the schema that defines this class */
  public get schemaName(): string { return Object.getPrototypeOf(this).constructor.schema.name; }

  /** Get the name of this class */
  public get className(): string { return Object.getPrototypeOf(this).constructor.name; }

  /** Determine whether this Entity is in the persistent (unmodified) state from the database. Persistent Entities may
   * not be changed in any way. To modify an Entity, make a copy of it using [[copyForEdit]].
   */
  public isPersistent() { return this.persistent; }

  /** make a copy of this Entity so that it may be be modified. */
  public copyForEdit<T extends Entity>() { return new (this.constructor as EntityCtor)(this) as T; }
}

/** A custom attribute instance */
export interface CustomAttribute {
  /** The class of the CustomAttribute */
  ecclass: string;
  /** An object whose properties correspond by name to the properties of this custom attribute instance. */
  properties: { [propName: string]: any };
}

type FactoryFunc = (jsonObj: any) => any;

/** Metadata for a property. */
export class PropertyMetaData {
  public primitiveType?: PrimitiveTypeCode;
  public structName?: string;
  public extendedType?: string;
  public description?: string;
  public displayLabel?: string;
  public minimumValue?: any;
  public maximumValue?: any;
  public minimumLength?: number;
  public maximumLength?: number;
  public readOnly?: boolean;
  public kindOfQuantity?: string;
  public isCustomHandled?: boolean;
  public isCustomHandledOrphan: boolean;
  public minOccurs?: number;
  public maxOccurs?: number;
  public direction?: string;
  public relationshipClass?: string;
  public customAttributes?: CustomAttribute[];

  public constructor(jsonObj: any) {
    this.primitiveType = jsonObj.primitiveType;
    if (jsonObj.structName)
      this.structName = jsonObj.structName;
    this.extendedType = jsonObj.extendedType;
    this.description = jsonObj.description;
    this.displayLabel = jsonObj.displayLabel;
    if (null != jsonObj.minimumValue)
      this.minimumValue = jsonObj.minimumValue;
    if (null != jsonObj.maximumValue)
      this.maximumValue = jsonObj.maximumValue;
    if (null != jsonObj.minimumLength)
      this.minimumLength = jsonObj.minimumLength;
    if (null != jsonObj.maximumLength)
      this.maximumLength = jsonObj.maximumLength;
    this.readOnly = jsonObj.readOnly;
    this.kindOfQuantity = jsonObj.kindOfQuantity;
    this.isCustomHandled = jsonObj.isCustomHandled;
    if (null != jsonObj.minOccurs)
      this.minOccurs = jsonObj.minOccurs;
    if (null != jsonObj.maxOccurs)
      this.maxOccurs = jsonObj.maxOccurs;
    this.direction = jsonObj.direction;
    this.relationshipClass = jsonObj.relationshipClass;
    this.customAttributes = jsonObj.customAttributes;
  }

  /** create a typed value, or array of values, from a factory and an input object */
  private createValueOrArray(func: FactoryFunc, jsonObj: any) {
    if (null == this.minOccurs)
      return func(jsonObj); // not an array

    const val: any = [];
    jsonObj.forEach((element: any) => val.push(func(element)));
    return val;
  }

  /** construct a single property from an input object according to this metadata */
  public createProperty(jsonObj: any): any {
    if (!jsonObj)
      return undefined;

    if (this.primitiveType) {
      switch (this.primitiveType) {
        case PrimitiveTypeCode.Boolean:
        case PrimitiveTypeCode.Double:
        case PrimitiveTypeCode.Integer:
        case PrimitiveTypeCode.String:
          return jsonObj; // this works even for arrays or strings that are JSON because the parsed JSON is already the right type

        case PrimitiveTypeCode.Point2d:
          return this.createValueOrArray(Point2d.fromJSON, jsonObj);

        case PrimitiveTypeCode.Point3d:
          return this.createValueOrArray(Point3d.fromJSON, jsonObj);
      }
    }
    if (null != this.direction) // the presence of this means it's a navigation property
      return new Id64(jsonObj);

    return jsonObj;
  }
}

/** Metadata for an Entity. */
export class EntityMetaData {
  /** The Entity name */
  public ecclass: string;
  public description?: string;
  public modifier?: string;
  public displayLabel?: string;
  /** The  base class that this class is derives from. If more than one, the first is the actual base class and the others are mixins. */
  public baseClasses: string[];
  /** The Custom Attributes for this class */
  public customAttributes?: CustomAttribute[];
  /** An object whose properties correspond by name to the properties of this class. */
  public properties: { [propName: string]: PropertyMetaData };

  public constructor(jsonObj: any) {
    this.ecclass = jsonObj.ecclass;
    this.description = jsonObj.description;
    this.modifier = jsonObj.modifier;
    this.displayLabel = jsonObj.displayLabel;
    this.baseClasses = jsonObj.baseClasses;
    this.customAttributes = jsonObj.customAttributes;
    this.properties = {};
    for (const propName in jsonObj.properties) {
      if (propName)
        this.properties[propName] = new PropertyMetaData(jsonObj.properties[propName]);
    }
  }

  /** Invoke a callback on each property of the specified class, optionally including superclass properties.
   * @param iModel  The IModel that contains the schema
   * @param schemaName The schema that defines the class
   * @param className The name of the class
   * @param wantSuper If true, superclass properties will also be processed
   * @param func The callback to be invoked on each property
   * @param includeCustom If true, include custom-handled properties in the iteration. Otherwise, skip custom-handled properties.
   */
  public static forEach(iModel: IModelDb, classFullName: string, wantSuper: boolean, func: PropertyCallback, includeCustom: boolean) {
    const meta = iModel.classMetaDataRegistry.find(classFullName);
    if (meta === undefined) {
      throw ClassRegistry.makeMetaDataNotFoundError();
    }

    for (const propName in meta.properties) {
      if (propName) {
        const propMeta = meta.properties[propName];
        if (includeCustom || !propMeta.isCustomHandled || propMeta.isCustomHandledOrphan)
          func(propName, propMeta);
      }
    }

    if (wantSuper && meta.baseClasses && meta.baseClasses.length > 0) {
      EntityMetaData.forEach(iModel, meta.baseClasses[0], true, func, includeCustom);
    }
  }
}
