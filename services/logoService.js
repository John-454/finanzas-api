'use strict';

// Almacenamiento de logos en MongoDB GridFS (bucket "logos").
// Validación por magic bytes: no se confía en el mimetype enviado por el cliente.

const mongoose = require('mongoose');

const BUCKET = 'logos';
const TAMANO_MAX = 2 * 1024 * 1024; // 2 MB

const FIRMAS = [
  { tipo: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { tipo: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { tipo: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { tipo: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], extra: { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] } },
];

/** Devuelve el MIME real según los primeros bytes, o null si no es una imagen permitida. */
function detectarTipo(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  for (const firma of FIRMAS) {
    const coincide = firma.bytes.every((b, i) => buffer[i] === b);
    if (!coincide) continue;

    if (firma.extra) {
      const ext = firma.extra.bytes.every((b, i) => buffer[firma.extra.offset + i] === b);
      if (!ext) continue;
    }
    return firma.tipo;
  }
  return null;
}

function validarTamano(buffer) {
  if (!Buffer.isBuffer(buffer)) return 'Archivo inválido';
  if (buffer.length === 0) return 'El archivo está vacío';
  if (buffer.length > TAMANO_MAX) return 'El logo no puede superar 2 MB';
  return null;
}

async function getBucket() {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Sin conexión a la base de datos');
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET });
}

/** Guarda el logo y devuelve el id del archivo. */
async function guardarLogo(usuarioId, buffer) {
  const errorTamano = validarTamano(buffer);
  if (errorTamano) {
    const err = new Error(errorTamano);
    err.status = 400;
    throw err;
  }

  const tipo = detectarTipo(buffer);
  if (!tipo) {
    const err = new Error('Formato de imagen no permitido (usa PNG, JPG, GIF o WebP)');
    err.status = 400;
    throw err;
  }

  const bucket = await getBucket();
  const extension = tipo.split('/')[1].replace('jpeg', 'jpg');

  return new Promise((resolve, reject) => {
    const stream = bucket.openUploadStream(`logo.${extension}`, {
      contentType: tipo,
      metadata: { usuarioId: String(usuarioId) },
    });
    stream.on('error', reject);
    stream.on('finish', () => resolve({ id: stream.id, tipo }));
    stream.end(buffer);
  });
}

/** Elimina un logo solo si pertenece al usuario. No lanza si no existe. */
async function eliminarLogo(usuarioId, logoId) {
  if (!logoId) return;
  const bucket = await getBucket();
  const _id = new mongoose.Types.ObjectId(String(logoId));

  const archivos = await bucket.find({ _id }).toArray();
  const archivo = archivos[0];
  if (!archivo) return;
  if (archivo.metadata?.usuarioId !== String(usuarioId)) return;

  await bucket.delete(_id);
}

/** Devuelve { stream, contentType } si el logo es del usuario, o null. */
async function abrirLogo(usuarioId, logoId) {
  if (!logoId) return null;
  const bucket = await getBucket();
  const _id = new mongoose.Types.ObjectId(String(logoId));

  const archivos = await bucket.find({ _id }).toArray();
  const archivo = archivos[0];
  if (!archivo) return null;
  if (archivo.metadata?.usuarioId !== String(usuarioId)) return null;

  return {
    stream: bucket.openDownloadStream(_id),
    contentType: archivo.contentType || 'application/octet-stream',
  };
}

module.exports = {
  BUCKET,
  TAMANO_MAX,
  detectarTipo,
  validarTamano,
  guardarLogo,
  eliminarLogo,
  abrirLogo,
};
