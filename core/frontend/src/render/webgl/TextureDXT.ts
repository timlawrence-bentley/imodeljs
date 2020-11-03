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
  levels: number;
  internalFormat: number;
}

// DXT formats, from:
// http://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_s3tc/
const COMPRESSED_RGB_S3TC_DXT1_EXT = 0x83F0;
// const COMPRESSED_RGBA_S3TC_DXT1_EXT = 0x83F1;
const COMPRESSED_RGBA_S3TC_DXT3_EXT = 0x83F2;
const COMPRESSED_RGBA_S3TC_DXT5_EXT = 0x83F3;

// DXT values and structures referenced from:
// http://msdn.microsoft.com/en-us/library/bb943991.aspx/
const DDS_MAGIC = 0x20534444;
const DDSD_MIPMAPCOUNT = 0x20000;
const DDPF_FOURCC = 0x4;

const DDS_HEADER_LENGTH = 31; // The header length in 32 bit ints.

// Offsets into the header array.
const DDS_HEADER_MAGIC = 0;

const DDS_HEADER_SIZE = 1;
const DDS_HEADER_FLAGS = 2;
const DDS_HEADER_HEIGHT = 3;
const DDS_HEADER_WIDTH = 4;

const DDS_HEADER_MIPMAPCOUNT = 7;

const DDS_HEADER_PF_FLAGS = 20;
const DDS_HEADER_PF_FOURCC = 21;

// FourCC format identifiers.
const FOURCC_DXT1 = fourCCToInt32("DXT1");
const FOURCC_DXT3 = fourCCToInt32("DXT3");
const FOURCC_DXT5 = fourCCToInt32("DXT5");

// Builds a numeric code for a given fourCC string
function fourCCToInt32(value: string) {
  return value.charCodeAt(0) +
    (value.charCodeAt(1) << 8) +
    (value.charCodeAt(2) << 16) +
    (value.charCodeAt(3) << 24);
}

// Parse a DDS file and provide information about the raw DXT data it contains to the given callback.
function _parseDDS(arrayBuffer: ArrayBuffer): DXTInfo | undefined {
  // Get a view of the arrayBuffer that represents the DDS header.
  const header = new Int32Array(arrayBuffer, 0, DDS_HEADER_LENGTH);

  // Do some sanity checks to make sure this is a valid DDS file.
  if (header[DDS_HEADER_MAGIC] !== DDS_MAGIC) {
    // errorCallback("Invalid magic number in DDS header");
    return undefined;
  }

  if (!(header[DDS_HEADER_PF_FLAGS] & DDPF_FOURCC)) {
    // errorCallback("Unsupported format, must contain a FourCC code");
    return undefined;
  }

  // Determine what type of compressed data the file contains.
  const fourCC = header[DDS_HEADER_PF_FOURCC];
  let internalFormat;
  switch (fourCC) {
    case FOURCC_DXT1:
      internalFormat = COMPRESSED_RGB_S3TC_DXT1_EXT;
      break;

    case FOURCC_DXT3:
      internalFormat = COMPRESSED_RGBA_S3TC_DXT3_EXT;
      break;

    case FOURCC_DXT5:
      internalFormat = COMPRESSED_RGBA_S3TC_DXT5_EXT;
      break;


    default:
      // errorCallback("Unsupported FourCC code: " + int32ToFourCC(fourCC));
      return;
  }

  // TODO: ATC in switch above?

  // Determine how many mipmap levels the file contains.
  let levels = 1;
  if (header[DDS_HEADER_FLAGS] & DDSD_MIPMAPCOUNT) {
    levels = Math.max(1, header[DDS_HEADER_MIPMAPCOUNT]);
  }

  // Gather other basic metrics and a view of the raw the DXT data.
  const width = header[DDS_HEADER_WIDTH];
  const height = header[DDS_HEADER_HEIGHT];
  const dataOffset = header[DDS_HEADER_SIZE] + 4;
  const dxtData = new Uint8Array(arrayBuffer, dataOffset);

  return { dxtData, width, height, levels, internalFormat };
}

// Calcualates the size of a compressed texture level in bytes
function textureLevelSize(format: number, width: number, height: number): number {
  switch (format) {
    case COMPRESSED_RGB_S3TC_DXT1_EXT:
      return ((width + 3) >> 2) * ((height + 3) >> 2) * 8;

    case COMPRESSED_RGBA_S3TC_DXT3_EXT:
    case COMPRESSED_RGBA_S3TC_DXT5_EXT:
      return ((width + 3) >> 2) * ((height + 3) >> 2) * 16;

    default:
      return 0;
  }
}

function _uploadDXT(dxtInfo: DXTInfo) {
  const gl = System.instance.context;

  let offset = 0;

  // const levelZeroSize = textureLevelSize(dxtInfo.internalFormat, dxtInfo.width, dxtInfo.height);

  let width = dxtInfo.width;
  let height = dxtInfo.height;

  // Loop through each mip level of compressed texture data provided and upload it to the given texture.
  for (let i = 0; i < dxtInfo.levels; ++i) {
    // Determine how big this level of compressed texture data is in bytes.
    const levelSize = textureLevelSize(dxtInfo.internalFormat, dxtInfo.width, dxtInfo.height);
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

  // We can't use gl.generateMipmaps with compressed textures, so only use
  // mipmapped filtering if the compressed texture data contained mip levels.
  if (dxtInfo.levels > 1) {
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
export function loadTexture2DImageDataForDXT(dxtBuffer: ArrayBuffer): void {
  // If the file loaded successfully parse it.
  const dxtInfo = _parseDDS(dxtBuffer);
  if (undefined !== dxtInfo)
    _uploadDXT(dxtInfo);
}
