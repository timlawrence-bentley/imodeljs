/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module WebGL
 */

import { BeTimePoint } from "@bentley/bentleyjs-core";
import { RenderCommands } from "./RenderCommands";
import { Target } from "./Target";
import { System } from "./System";

export class ParticleSystem {
  private _lastUpdate: BeTimePoint;

  private constructor() {
    this._lastUpdate = BeTimePoint.now();
  }

  public dispose(): void {
  }

  public static create(): ParticleSystem | undefined {
    if (!System.instance.isWebGL2)
      return undefined;

    return new ParticleSystem();
  }

  public addCommands(_cmds: RenderCommands): void {
  }

  public update(_target: Target): void {
    const now = BeTimePoint.now();
    // const elapsed = now.minus(this._lastUpdate);
    this._lastUpdate = now;
  }
}
