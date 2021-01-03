/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Rendering
 */

/** The underlying data types that can be used for varying variables in a shader program.
 * @see [[ScreenSpaceEffectBuilder.addVarying]] to define a varying variable for a screen-space effect shader.
 * @beta
 */
export enum VaryingType {
  /** GLSL `float`. */
  Float,
  /** GLSL `vec2`. */
  Vec2,
  /** GLSL `vec3`. */
  Vec3,
  /** GLSL `vec4`. */
  Vec4,
}
