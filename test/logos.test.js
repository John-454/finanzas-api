'use strict';

// Logos: validación por magic bytes y control de tamaño (GridFS).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { detectarTipo, validarTamano, TAMANO_MAX } = require('../services/logoService');

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(20, 0),
]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20, 0)]);
const GIF = Buffer.concat([Buffer.from('GIF89a', 'ascii'), Buffer.alloc(20, 0)]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from('WEBP', 'ascii'),
  Buffer.alloc(20, 0),
]);

test('detecta PNG, JPEG, GIF y WebP por magic bytes', () => {
  assert.equal(detectarTipo(PNG), 'image/png');
  assert.equal(detectarTipo(JPEG), 'image/jpeg');
  assert.equal(detectarTipo(GIF), 'image/gif');
  assert.equal(detectarTipo(WEBP), 'image/webp');
});

test('rechaza SVG (vector de XSS) aunque el cliente diga image/png', () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  assert.equal(detectarTipo(svg), null);
});

test('rechaza archivos demasiado cortos o vacíos', () => {
  assert.equal(detectarTipo(Buffer.alloc(0)), null);
  assert.equal(detectarTipo(Buffer.from([0x89, 0x50])), null);
  assert.equal(detectarTipo('no es buffer'), null);
});

test('valida tamaño máximo de 2 MB', () => {
  assert.equal(TAMANO_MAX, 2 * 1024 * 1024);
  assert.equal(validarTamano(Buffer.alloc(0)), 'El archivo está vacío');
  assert.equal(validarTamano(Buffer.alloc(1024)), null);
  assert.match(validarTamano(Buffer.alloc(TAMANO_MAX + 1)), /2 MB/);
});
