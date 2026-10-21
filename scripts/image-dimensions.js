"use strict";

// Read only the PNG/JPEG headers needed to validate supplied website artwork.
function imageDimensions(buffer, type) {
  if (type === "image/png" && buffer.length >= 24 &&
      buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
      buffer.toString("ascii", 12, 16) === "IHDR") {
    return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
  }
  if (type === "image/jpeg" && buffer.length >= 4 && buffer.readUInt16BE(0) === 0xffd8) {
    let offset = 2;
    while (offset + 4 <= buffer.length) {
      if (buffer[offset++] !== 0xff) break;
      while (buffer[offset] === 0xff) offset += 1;
      const marker = buffer[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (offset + 2 > buffer.length) break;
      const length = buffer.readUInt16BE(offset);
      if (length < 2 || offset + length > buffer.length) break;
      if ([0xc0, 0xc1, 0xc2].includes(marker) && length >= 8) {
        return [buffer.readUInt16BE(offset + 5), buffer.readUInt16BE(offset + 3)];
      }
      offset += length;
    }
  }
  throw new Error(`Invalid or unsupported ${type} image header`);
}

module.exports = { imageDimensions };
