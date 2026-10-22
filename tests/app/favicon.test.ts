import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');

describe('마냑 파비콘 자산', () => {
  it('App Router SVG는 원본 심볼과 같다', () => {
    expect(readFileSync(resolve(root, 'src/app/icon.svg'))).toEqual(
      readFileSync(resolve(root, 'public/logo/manyak-symbol-green.svg')),
    );
  });

  it('ICO의 16·32·48px 프레임은 모두 Turbopack이 읽는 8비트 RGBA PNG다', () => {
    const ico = readFileSync(resolve(root, 'src/app/favicon.ico'));
    const sizes = [16, 32, 48];

    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(sizes.length);

    sizes.forEach((size, index) => {
      const entry = 6 + index * 16;
      const length = ico.readUInt32LE(entry + 8);
      const offset = ico.readUInt32LE(entry + 12);

      expect([ico[entry], ico[entry + 1]]).toEqual([size, size]);
      expect(ico.readUInt16LE(entry + 4)).toBe(1);
      expect(ico.readUInt16LE(entry + 6)).toBe(32);
      expect(offset).toBeGreaterThanOrEqual(6 + sizes.length * 16);
      expect(offset + length).toBeLessThanOrEqual(ico.length);

      const png = ico.subarray(offset, offset + length);

      expect([...png.subarray(0, 8)]).toEqual([
        137, 80, 78, 71, 13, 10, 26, 10,
      ]);
      expect(png.toString('ascii', 12, 16)).toBe('IHDR');
      expect(png.readUInt32BE(16)).toBe(size);
      expect(png.readUInt32BE(20)).toBe(size);
      expect(png[24]).toBe(8);
      expect(png[25]).toBe(6);
    });
  });
});
