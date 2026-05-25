const fs = require("fs");
const path = require("path");

const iconsetDir = path.join(__dirname, "..", "build", "icon.iconset");
const outputPath = path.join(__dirname, "..", "build", "icon.ico");
const inputs = [
  ["icon_16x16.png", 16],
  ["icon_32x32.png", 32],
  ["icon_256x256.png", 256]
];

const images = inputs.map(([file, size]) => {
  const data = fs.readFileSync(path.join(iconsetDir, file));
  return { size, data };
});

const headerSize = 6 + images.length * 16;
let offset = headerSize;
const directory = Buffer.alloc(headerSize);
directory.writeUInt16LE(0, 0);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(images.length, 4);

images.forEach((image, index) => {
  const entryOffset = 6 + index * 16;
  directory.writeUInt8(image.size === 256 ? 0 : image.size, entryOffset);
  directory.writeUInt8(image.size === 256 ? 0 : image.size, entryOffset + 1);
  directory.writeUInt8(0, entryOffset + 2);
  directory.writeUInt8(0, entryOffset + 3);
  directory.writeUInt16LE(1, entryOffset + 4);
  directory.writeUInt16LE(32, entryOffset + 6);
  directory.writeUInt32LE(image.data.length, entryOffset + 8);
  directory.writeUInt32LE(offset, entryOffset + 12);
  offset += image.data.length;
});

fs.writeFileSync(outputPath, Buffer.concat([directory, ...images.map((image) => image.data)]));
console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`);
