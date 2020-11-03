/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module WebGL
 */

import { System } from "./System";

interface DXTInfo {
  dxtData: any;
  width: number;
  height: number;
  numLevels: number;
  internalFormat: number;
}

// See the following link describing the format of a DDS file:
// http://msdn.microsoft.com/en-us/library/bb943991.aspx/
class DDSFormatConstants {
  public static readonly magic = 0x20534444;
  public static readonly mipMapCount = 0x20000;
  public static readonly fourCC = 0x4;
  public static readonly headerLength = 31;
  public static readonly headerMagic = 0;
  public static readonly headerSize = 1;
  public static readonly headerFlags = 2;
  public static readonly headerHeight = 3;
  public static readonly headerWidth = 4;
  public static readonly headerMipMapCount = 7;
  public static readonly headerPfFlags = 20;
  public static readonly headerPfFourCC = 21;
  public static readonly fourCCDXT1 = _buildFourCC("DXT1");
  public static readonly fourCCDXT3 = _buildFourCC("DXT3");
  public static readonly fourCCDXT5 = _buildFourCC("DXT5");
}

function _buildFourCC(value: string) {
  return value.charCodeAt(0) + (value.charCodeAt(1) << 8) + (value.charCodeAt(2) << 16) + (value.charCodeAt(3) << 24);
}

// See the following link for a discussion of the DXT format:
// http://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_s3tc/
function _readDDSHeader(s3tcExt: WEBGL_compressed_texture_s3tc, arrayBuffer: ArrayBuffer): DXTInfo | undefined {
  const header = new Int32Array(arrayBuffer, 0, DDSFormatConstants.headerLength);

  if (header[DDSFormatConstants.headerMagic] !== DDSFormatConstants.magic) {
    return undefined; // not a valid DDS file
  }

  if (!(header[DDSFormatConstants.headerPfFlags] & DDSFormatConstants.fourCC)) {
    return undefined; // not a valid DDS format
  }

  // Find the proper internal format.
  const fourCC = header[DDSFormatConstants.headerPfFourCC];
  let internalFormat;
  switch (fourCC) {
    case DDSFormatConstants.fourCCDXT1:
      internalFormat = s3tcExt.COMPRESSED_RGB_S3TC_DXT1_EXT;
      break;

    case DDSFormatConstants.fourCCDXT3:
      internalFormat = s3tcExt.COMPRESSED_RGBA_S3TC_DXT3_EXT;
      break;

    case DDSFormatConstants.fourCCDXT5:
      internalFormat = s3tcExt.COMPRESSED_RGBA_S3TC_DXT5_EXT;
      break;

    default:
      return undefined;
  }

  // Determine how many mipmap levels the DDS file contains.
  let numLevels = 1;
  if (header[DDSFormatConstants.headerFlags] & DDSFormatConstants.mipMapCount)
    numLevels = Math.max(1, header[DDSFormatConstants.headerMipMapCount]);

  const width = header[DDSFormatConstants.headerWidth];
  const height = header[DDSFormatConstants.headerHeight];
  const dataOffset = header[DDSFormatConstants.headerSize] + 4;
  const dxtData = new Uint8Array(arrayBuffer, dataOffset);

  return { dxtData, width, height, numLevels, internalFormat };
}

function _calculateTextureLevelSizeInBytes(s3tcExt: WEBGL_compressed_texture_s3tc, format: number, width: number, height: number): number {
  switch (format) {
    case s3tcExt.COMPRESSED_RGB_S3TC_DXT1_EXT:
      return ((width + 3) >> 2) * ((height + 3) >> 2) * 8;

    case s3tcExt.COMPRESSED_RGBA_S3TC_DXT3_EXT:
    case s3tcExt.COMPRESSED_RGBA_S3TC_DXT5_EXT:
      return ((width + 3) >> 2) * ((height + 3) >> 2) * 16;

    default:
      return 0;
  }
}

function _loadDXT(dxtInfo: DXTInfo) {
  const gl = System.instance.context;

  const s3tcExt = System.instance.capabilities.queryExtensionObject<WEBGL_compressed_texture_s3tc>("WEBGL_compressed_texture_s3tc")!;

  let offset = 0;

  // const levelZeroSize = _calculateTextureLevelSizeInBytes(s3tcExt, dxtInfo.internalFormat, dxtInfo.width, dxtInfo.height);

  let width = dxtInfo.width;
  let height = dxtInfo.height;

  // Loop through each mip level of compressed texture data provided and upload it to the given texture.
  for (let i = 0; i < dxtInfo.numLevels; ++i) {
    // Determine how big this level of compressed texture data is in bytes.
    const levelSize = _calculateTextureLevelSizeInBytes(s3tcExt, dxtInfo.internalFormat, dxtInfo.width, dxtInfo.height);
    // Get a view of the bytes for this level of DXT data.
    const dxtLevel = new Uint8Array(dxtInfo.dxtData.buffer, dxtInfo.dxtData.byteOffset + offset, levelSize);
    // Upload!
    gl.compressedTexImage2D(gl.TEXTURE_2D, i, dxtInfo.internalFormat, width, height, 0, dxtLevel);
    // The next mip level will be half the height and width of this one.
    width = width >> 1;
    height = height >> 1;
    // Advance the offset into the compressed texture data past the current mip level's data.
    offset += levelSize;
  }

  if (dxtInfo.numLevels > 1) { // we have several levels of detail
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
}

/** Associate texture data with a WebGLTexture from a DXT-compressed image.
 * @internal
*/
export function loadTexture2DImageDataForDXT(dxtBuffer: ArrayBuffer): boolean {
  const s3tcExt = System.instance.capabilities.queryExtensionObject<WEBGL_compressed_texture_s3tc>("WEBGL_compressed_texture_s3tc");
  if (undefined === s3tcExt)
    return false; // DXT GL extension not available

  const dxtInfo = _readDDSHeader(s3tcExt, dxtBuffer);
  if (undefined === dxtInfo)
    return false; // Failed to read DDS header

  _loadDXT(dxtInfo);
  return true;
}
