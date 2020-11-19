/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module WebGL
 */

import { System } from "./System";

interface DXTInfo {
  dxtPixelData: Uint8Array;
  width: number;
  height: number;
  glInternalFormat: number;
}

class DXTInfoConstants {
  public static readonly ndxFormat = 0;
  public static readonly ndxWidth = 1;
  public static readonly ndxHeight = 2;
  public static readonly codeDXT1 = 1;
  public static readonly codeDXT3 = 3;
  public static readonly codeDXT5 = 5;
  public static readonly infoLength = 3; // 3x uint32
}

function _readDXTInfo(s3tcExt: WEBGL_compressed_texture_s3tc, byteBuffer: Uint8Array): DXTInfo | undefined {
  const dxtHeaderBuffer = new Uint8Array(12);
  dxtHeaderBuffer.set(byteBuffer.subarray(0, 11), 0);

  const header = new Uint32Array(dxtHeaderBuffer.buffer, 0, 3);

  const format = header[DXTInfoConstants.ndxFormat];
  let glInternalFormat;
  switch (format) {
    case DXTInfoConstants.codeDXT1:
      glInternalFormat = s3tcExt.COMPRESSED_RGB_S3TC_DXT1_EXT;
      break;

    case DXTInfoConstants.codeDXT3:
      glInternalFormat = s3tcExt.COMPRESSED_RGBA_S3TC_DXT3_EXT;
      break;

    case DXTInfoConstants.codeDXT5:
      glInternalFormat = s3tcExt.COMPRESSED_RGBA_S3TC_DXT5_EXT;
      break;

    default:
      return undefined;
  }

  const width = header[DXTInfoConstants.ndxWidth];
  const height = header[DXTInfoConstants.ndxHeight];

  const dxtBuffer = new Uint8Array(byteBuffer.byteLength - 12);
  dxtBuffer.set(byteBuffer.subarray(12, byteBuffer.byteLength - 12), 0);

  return { dxtPixelData: dxtBuffer, width, height, glInternalFormat };
}

// ###TODO: this function will be helpful when tracking the GPU memory usage
// function _calculateTextureSizeInBytes(s3tcExt: WEBGL_compressed_texture_s3tc, format: number, width: number, height: number): number {
//   switch (format) {
//     case s3tcExt.COMPRESSED_RGB_S3TC_DXT1_EXT:
//       return ((width + 3) / 4) * ((height + 3) >> 2) * 8;

//     case s3tcExt.COMPRESSED_RGBA_S3TC_DXT3_EXT:
//     case s3tcExt.COMPRESSED_RGBA_S3TC_DXT5_EXT:
//       return ((width + 3) / 4) * ((height + 3) >> 2) * 16;

//     default:
//       return 0;
//   }
// }

function _loadDXT(dxtInfo: DXTInfo) {
  const gl = System.instance.context;
  gl.compressedTexImage2D(gl.TEXTURE_2D, 0, dxtInfo.glInternalFormat, dxtInfo.width, dxtInfo.height, 0, dxtInfo.dxtPixelData);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
}

/** Associate texture data with a WebGLTexture from a DXT-compressed image.
 * @internal
*/
export function loadTexture2DImageDataForDXT(dxtBuffer: Uint8Array): boolean {
  const s3tcExt = System.instance.capabilities.queryExtensionObject<WEBGL_compressed_texture_s3tc>("WEBGL_compressed_texture_s3tc");
  if (undefined === s3tcExt)
    return false; // DXT GL extension not available

  const dxtInfo = _readDXTInfo(s3tcExt, dxtBuffer);
  if (undefined === dxtInfo)
    return false; // Failed to read DDS header

  _loadDXT(dxtInfo);
  return true;
}
