'use strict';

// Multer en memoria: el binario va directo a GridFS, nunca al disco local.
// El tipo real se valida por magic bytes en services/logoService.

const multer = require('multer');
const { TAMANO_MAX } = require('../services/logoService');

const TIPOS_DECLARADOS = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANO_MAX, files: 1 },
  fileFilter(_req, file, cb) {
    if (!TIPOS_DECLARADOS.includes(file.mimetype)) {
      const err = new Error('Tipo de archivo no permitido. Usa PNG, JPG, GIF o WebP');
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

/** Middleware que traduce errores de Multer a errores HTTP controlados. */
function subirLogo(req, res, next) {
  upload.single('logo')(req, res, (err) => {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
      err.status = 400;
      err.message = 'El logo no puede superar 2 MB';
    } else if (!err.status) {
      err.status = 400;
    }
    return next(err);
  });
}

module.exports = { subirLogo };
