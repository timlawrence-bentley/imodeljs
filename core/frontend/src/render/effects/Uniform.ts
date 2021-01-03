/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Rendering
 */

import { Viewport } from "../../Viewport";

/** The underlying data types that can be used for uniform variables in effect shaders.
 * @see [[ScreenSpaceEffectBuilder.addUniform]] to define a uniform variable.
 * @see [[Uniform]] to set the value of a uniform variable.
 * @beta
 */
export enum UniformType {
  /** GLSL `bool`. */
  Bool,
  /** GLSL `int`. */
  Int,
  /** GLSL `float`. */
  Float,
  /** GLSL `vec2`. */
  Vec2,
  /** GLSL `vec3`. */
  Vec3,
  /** GLSL `vec4`. */
  Vec4,
}

/** Represents a uniform variable in a shader program used by a custom effect shader, providing methods for setting the current value of the uniform.
 * @see [[UniformParams.bind]].
 * @see [[ScreenSpaceEffectBuilder.addUniform]].
 * @beta
 */
export interface Uniform {
  /** Sets the value to an integer - equivalent to `WebGLRenderingContext.uniform1i`. */
  setUniform1i: (value: number) => void;
  /** Sets the value to a float - equivalent to `WebGLRenderingContext.uniform1f`. */
  setUniform1f: (value: number) => void;
  /** Sets the value to an array of floats - equivalent to `WebGLRenderingContext.uniform1fv`. */
  setUniform1fv: (value: Float32Array | number[]) => void;
  /** Sets the value to an array of integers - equivalent to `WebGLRenderingContext.uniform1iv`. */
  setUniform1iv: (value: Int32Array | number[]) => void;
  /** Sets the value as a vec2, equivalent to `WebGLRenderingContext.uniform2fv`. */
  setUniform2fv: (value: Float32Array | number[]) => void;
  /** Sets the value as a vec3 - equivalent to `WebGLRenderingContext.uniform3fv`. */
  setUniform3fv: (value: Float32Array | number[]) => void;
  /** Sets the value as a vec4 - equivalent to `WebGLRenderingContext.uniform4fv`. */
  setUniform4fv: (value: Float32Array | number[]) => void;
}

/** Context supplied to [[UniformParams.bind]].
 * @beta
 */
export interface UniformContext {
  /** The viewport to which the effect shader is to be applied. */
  viewport: Viewport;
}

/** Parameters used to define a uniform variable for a custom effect shader.
 * @see [[ScreenSpaceEffectBuilder.addUniform]] to define a uniform for a screen-space effect.
 * @beta
 */
export interface UniformParams<T extends UniformContext = UniformContext> {
  /** The data type of the uniform variable. */
  type: UniformType;
  /** The name of the variable. It must be unique among all uniforms used by the shader program. */
  name: string;
  /** A function that computes the value of the variable and binds it to the shader program each time the effect is rendered. */
  bind: (uniform: Uniform, context: T) => void;
}

/** Parameters used to define an array of uniform variables for a custom effect shader.
 * @see [[ScreenSpaceEffectBuilder.addUniformArray]] to define a uniform array for a screen-space effect.
 * @beta
 */
export interface UniformArrayParams<T extends UniformContext = UniformContext> extends UniformParams<T> {
  /** The number of elements in the array. */
  length: number;
}
