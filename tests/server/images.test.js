import { describe, expect, it, vi } from 'vitest';
import { MAX_IMAGE_BYTES, checkImageRef, purgeOrphanImages, sniffMime, storeImage } from '../../server/lib/images.js';

const PNG = Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n', 'latin1'), Buffer.alloc(16)]);
const pngUrl = `data:image/png;base64,${PNG.toString('base64')}`;
const placeholder = 'data:image/svg+xml;utf8,%3Csvg%3E';

describe('sniffMime', () => {
  it('detecta el tipo real por los primeros bytes', () => {
    expect(sniffMime(PNG)).toBe('image/png');
    expect(sniffMime(Buffer.from([0xff, 0xd8, 0xff, ...Array(12).fill(0)]))).toBe('image/jpeg');
    expect(sniffMime(Buffer.from('GIF89a' + '\0'.repeat(10), 'latin1'))).toBe('image/gif');
    expect(sniffMime(Buffer.from('RIFF\0\0\0\0WEBP' + '\0'.repeat(4), 'latin1'))).toBe('image/webp');
    expect(sniffMime(Buffer.from('\0\0\0\0ftypavif' + '\0'.repeat(4), 'latin1'))).toBe('image/avif');
  });

  it('devuelve null para datos desconocidos o demasiado cortos', () => {
    expect(sniffMime(Buffer.from('hola'))).toBeNull();
    expect(sniffMime(Buffer.alloc(20))).toBeNull();
  });
});

describe('checkImageRef', () => {
  it.each([undefined, '', '   ', 42])('exige un valor (%j)', v => {
    expect(() => checkImageRef(v)).toThrow(/obligatoria/);
  });

  it('acepta rutas del sitio, URLs http(s), data URL permitida y placeholder', () => {
    expect(checkImageRef(' /img/ps5.avif ')).toBe('/img/ps5.avif');
    expect(checkImageRef('https://ejemplo.cl/a.png')).toBe('https://ejemplo.cl/a.png');
    expect(checkImageRef(pngUrl)).toBe(pngUrl);
    expect(checkImageRef(placeholder)).toBe(placeholder);
  });

  it('rechaza protocolos peligrosos, rutas // y formatos no permitidos', () => {
    expect(() => checkImageRef('javascript:alert(1)')).toThrow(/no es válida/);
    expect(() => checkImageRef('//evil.com/a.png')).toThrow(/no es válida/);
    expect(() => checkImageRef('data:text/html;base64,AAAA')).toThrow(/JPG, PNG/);
    expect(() => checkImageRef('data:image/png,sinbase64')).toThrow(/JPG, PNG/);
    expect(() => checkImageRef('/' + 'a'.repeat(2000))).toThrow(/no es válida/);
    expect(() => checkImageRef(placeholder + 'x'.repeat(2000))).toThrow(/no es válida/);
  });
});

describe('storeImage', () => {
  it('guarda una foto base64 en MySQL y devuelve su URL', async () => {
    const conn = { query: vi.fn().mockResolvedValue([{ insertId: 7 }]) };
    await expect(storeImage(conn, pngUrl)).resolves.toBe('/api/imagenes/7');
    expect(conn.query.mock.calls[0][1][0]).toBe('image/png');
  });

  it('no toca rutas, URLs ni el placeholder', async () => {
    const conn = { query: vi.fn() };
    await expect(storeImage(conn, '/img/ps4.webp')).resolves.toBe('/img/ps4.webp');
    await expect(storeImage(conn, placeholder)).resolves.toBe(placeholder);
    expect(conn.query).not.toHaveBeenCalled();
  });

  it('rechaza archivos que declaran ser imagen pero no lo son', async () => {
    const fake = `data:image/png;base64,${Buffer.from('esto no es una imagen').toString('base64')}`;
    await expect(storeImage({ query: vi.fn() }, fake)).rejects.toMatchObject({ status: 400 });
  });

  it('rechaza imágenes de más de 3 MB con 413', async () => {
    const big = `data:image/png;base64,${Buffer.concat([PNG, Buffer.alloc(MAX_IMAGE_BYTES)]).toString('base64')}`;
    await expect(storeImage({ query: vi.fn() }, big)).rejects.toMatchObject({ status: 413 });
  });
});

describe('purgeOrphanImages', () => {
  it('borra solo imágenes que ningún producto ni galería referencia', async () => {
    const conn = { query: vi.fn().mockResolvedValue([{}]) };
    await purgeOrphanImages(conn);
    const sql = conn.query.mock.calls[0][0];
    expect(sql).toMatch(/DELETE i FROM imagenes/);
    expect(sql).toMatch(/productos/);
    expect(sql).toMatch(/producto_imagenes/);
  });
});
