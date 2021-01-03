/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Rendering
 */

import { Viewport } from "../../Viewport";
import { UniformArrayParams, UniformParams } from "./Uniform";
import { VaryingType } from "./VaryingType";

/** The GLSL implementation of the effect produced by a [[ScreenSpaceEffectBuilder]], to be integrated into a complete shader program. The effect shader code differs slightly from that of an ordinary shader:
 *  - Instead of `main`, it should implement `effectMain`.
 *    - It can include other functions, variables, etc outside of `effectMain`.
 *  - It should omit declarations of uniform and varying variables - these will be generated from those supplied to [[ScreenSpaceEffectBuilder.addUniform]] and [[ScreenSpaceEffectBuilder.addVarying]].
 * The program receives one pre-defined `uniform sampler2D u_diffuse` representing the viewport's rendered image.
 * Because the [[RenderSystem]] uses either WebGL1 or WebGL2 based on the capabilities of the client, the effect shader should be written to compile with either; or, [[ScreenSpaceEffectBuilder.isWebGL2]] should be tested.
 * The [[RenderSystem]] takes care of adjusting the source code for some of these differences, e.g., `varying` (WebGL1) vs `in` and `out` (WebGL2);
 * and `TEXTURE`, `TEXTURE_CUBE`, and `TEXTURE_PROJ` macros are provided to replace `texture2D`, `textureCube`, and `texture2DProj` with their WebGL2 equivalents when applicable.
 * @beta
 */
export interface ScreenSpaceEffectSource {
  /** The GLSL implementation of the vertex shader. Instead of `main`, it implements `void effectMain(vec4 position)` where `position` is the vertex position in normalized device coordinates ([-1..1]).
   * `effectMain` should compute whatever information is required by the fragment shader. It should not assign to `gl_Position`.
   */
  vertex: string;

  /** The GLSL implementation of the fragment shader. Instead of `main`, it implements `vec4 effectMain()` returning the color to be output.
   * `effectMain` should sample `u_diffuse` directly using `TEXTURE()` or `TEXTURE_PROJ()` instead of `texture2D()`, `texture2DProj()`, or `texture()`;
   * or, if [[ScreenSpaceEffectSource.sampleSourcePixel]] is defined, it can use `sampleSourcePixel()` instead.
   * It should not assign to `gl_FragColor`.
   * The alpha component of the output color is ignored as there is nothing with which to blend.
   */
  fragment: string;

  /** If the fragment shader shifts pixels from their original locations, then by default element locate will not work, because it expects the pixels produced by an element
   * to remain at their original locations. This can be fixed by supplying the body of a GLSL function `vec4 sampleSourcePixel()` that, as part of the fragment shader,
   * obtains the pixel in the source image corresponding to the pixel that will be output by the shader.
   * For example, if the source pixel is simply specified by a `varying vec2 v_texCoord` computed by the vertex shader, then this property should be defined as `return TEXTURE(u_diffuse, v_texCoord);`.
   * This function will automatically be included in the fragment shader, so it can also be used by `effectMain` when computing the output color.
   * @note `sampleSourcePixel` should not modify the sample in any way - that should be done only in `effectMain`.
   * @note `sampleSourcePixel` should **not** be supplied if the effect does **not** shift pixels as it can negatively impact performance of element locate.
   * @see [FlipImageEffect]($frontend-devtools) or [LensDistortionEffect]($frontend-devtools) for examples of effects that implement this property.
   */
  sampleSourcePixel?: string;
}

/** Parameters used to create a [[ScreenSpaceEffectBuilder]].
 * @see [[RenderSystem.createScreenSpaceEffectBuilder]].
 * @beta
 */
export interface ScreenSpaceEffectBuilderParams {
  /** The name of the effect. Must be unique among all registered screen-space effects. It is not displayed to the user. */
  name: string;
  /** If true, adds a `vec2 textureCoordFromPosition(vec4 position)` function to the vertex shader that computes a UV coordinate based on the vertex's position. */
  textureCoordFromPosition?: boolean;

  /** The GLSL implementation of the effect.
   * @see [[ScreenSpaceEffectSource]] for details.
   */
  source: ScreenSpaceEffectSource;
}

/** Context passed to [[ScreenSpaceEffectBuilder.shouldApply]].
 * @beta
 */
export interface ScreenSpaceEffectContext {
  /** The viewport to which the screen-space effect is to be applied. */
  viewport: Viewport;
}

/** An interface used to construct and register with the [[IModelApp.renderSystem]] a custom screen-space effect.
 * Screen-space effects take as input the image rendered by a Viewport, as a WebGL texture, and execute a shader program to modify the image.
 * Any number of screen-space effects can be registered, but each must have a unique name. Each Viewport has an ordered list of effects to be applied to it.
 *
 * Each time a Viewport's contents are rendered, the [[RenderSystem]] does the following:
 *  - Render Viewport's contents to a texture.
 *  - For each effect name in [[Viewport.screenSpaceEffects]]:
 *    - Look up the corresponding registered effect.
 *    - If `shouldApply is defined and returns false, skip the effect. Otherwise:
 *    - For each [[Uniform]] defined by the effect, invoke its `bind` property to set its current value.
 *    - Bind the Viewport's rendered image to the uniform `u_diffuse`.
 *    - Execute the effect shader to alter the viewport's image.
 * In this way, a series of multiple effects can be chained together, each consuming as input the image output by the previous effect.
 *
 * A screen-space effect that **moves** pixels from their original locations rather than simply recoloring them may cause some tools to behave unexpectedly:
 *  - Element locate will only work correctly if [[ScreenSpaceEffectBuilderParams.sampleSourcePixel]] is properly defined.
 *  - Tools like the measurement tool that require snapping to element geometry will not snap correctly since the element geometry has been distorted by the shader.
 * @see [[RenderSystem.createScreenSpaceEffectBuilder]] to create and register a new effect.
 * @see [[ScreenSpaceEffectBuilderParams]] to define the initial state of the builder.
 * @see [[Viewport.screenSpaceEffects]], [[Viewport.addScreenSpaceEffect]], and [[Viewport.removeScreenSpaceEffects]] to change the effects applied to a viewport.
 * @see [ConvolutionEffect]($frontend-devtools) for examples of effects like blur, sharpen, and emboss.
 * @see [LensDistortionEffect]($frontend-devtools) for an simulation of the fish-eye distortion produced by real-world cameras with very wide fields of view.
 * @see [SaturationEffect]($frontend-devtools) for an example of an effect that adjusts the saturation of the original image.
 * @see [FlipImageEffect]($frontend-devtools) for a very simple example of an effect that shifts pixels from their original locations.
 * @beta
 */
export interface ScreenSpaceEffectBuilder {
  /** True if the shader will be used with a WebGL 2 rendering context. */
  readonly isWebGL2: boolean;

  /** Add a uniform variable to the shader program. */
  addUniform: (params: UniformParams) => void;

  /** Add an array of uniform variables to the shader program. */
  addUniformArray: (params: UniformArrayParams) => void;

  /** Add a varying variable to the shader program. */
  addVarying: (name: string, type: VaryingType) => void;

  /** If defined, a function invoked each frame before the effect is applied. If it returns false, the effect will be skipped for that frame. */
  shouldApply?: (context: ScreenSpaceEffectContext) => boolean;

  /** Finishes construction of the effect and, if successful, registers it with [[IModelApp.renderSystem]].
   * @throws Error if the shader fails to compile and link, or an effect with the same name has already been registered.
   * @note After `finish` is called, no other properties or methods of the builder will have any effect.
   */
  finish: () => void;
}
