const Empresa = require('../models/Empresa');
const { subirLogo } = require('../middlewares/logoUpload');
const logoService = require('../services/logoService');

const RUTA_LOGO = '/api/empresa/logo';

// Obtener empresa del usuario autenticado
exports.obtenerEmpresa = async (req, res, next) => {
  try {
    const empresa = await Empresa.findOne({ usuarioId: req.usuario.id });

    if (!empresa) {
      return res.status(404).json({ error: 'No se encontró empresa para este usuario' });
    }

    res.json(empresa);
  } catch (err) {
    return next(err);
  }
};

// Crear empresa (solo una por usuario)
exports.crearEmpresa = async (req, res, next) => {
  try {
    const empresaExistente = await Empresa.findOne({ usuarioId: req.usuario.id });
    if (empresaExistente) {
      return res.status(400).json({ error: 'El usuario ya tiene una empresa registrada' });
    }

    const { nombre, direccion, ciudad, contacto } = req.body;

    if (!nombre || !direccion || !ciudad || !contacto) {
      return res.status(400).json({
        error: 'Todos los campos son requeridos: nombre, direccion, ciudad, contacto',
      });
    }

    let logoId = null;
    if (req.file) {
      const guardado = await logoService.guardarLogo(req.usuario.id, req.file.buffer);
      logoId = guardado.id;
      req.logoId = logoId; // para limpiar si falla el guardado de la empresa
    }

    const nuevaEmpresa = new Empresa({
      nombre,
      direccion,
      ciudad,
      contacto,
      logo: logoId ? RUTA_LOGO : null,
      logoId,
      usuarioId: req.usuario.id,
    });

    await nuevaEmpresa.save();

    res.status(201).json(nuevaEmpresa);
  } catch (err) {
    // Si se guardó el logo pero falló la creación, limpiar el archivo
    if (req.file && req.logoId) {
      await logoService.eliminarLogo(req.usuario.id, req.logoId).catch(() => {});
    }
    return next(err);
  }
};

// Actualizar empresa del usuario
exports.actualizarEmpresa = async (req, res, next) => {
  try {
    const empresa = await Empresa.findOne({ usuarioId: req.usuario.id });

    if (!empresa) {
      return res.status(404).json({ error: 'No se encontró empresa para este usuario' });
    }

    const { nombre, direccion, ciudad, contacto } = req.body;

    if (nombre) empresa.nombre = nombre;
    if (direccion) empresa.direccion = direccion;
    if (ciudad) empresa.ciudad = ciudad;
    if (contacto) empresa.contacto = contacto;

    if (req.file) {
      const guardado = await logoService.guardarLogo(req.usuario.id, req.file.buffer);
      const logoAnterior = empresa.logoId;

      empresa.logoId = guardado.id;
      empresa.logo = RUTA_LOGO;
      req.logoId = guardado.id;

      // Eliminar el logo anterior solo después de guardar el nuevo
      if (logoAnterior) {
        await logoService.eliminarLogo(req.usuario.id, logoAnterior).catch(() => {});
      }
    }

    await empresa.save();

    res.json(empresa);
  } catch (err) {
    if (req.file && req.logoId) {
      await logoService.eliminarLogo(req.usuario.id, req.logoId).catch(() => {});
    }
    return next(err);
  }
};

// Eliminar empresa del usuario
exports.eliminarEmpresa = async (req, res, next) => {
  try {
    const empresa = await Empresa.findOne({ usuarioId: req.usuario.id });

    if (!empresa) {
      return res.status(404).json({ error: 'No se encontró empresa para este usuario' });
    }

    if (empresa.logoId) {
      await logoService.eliminarLogo(req.usuario.id, empresa.logoId).catch(() => {});
    }

    await empresa.deleteOne();

    res.json({ mensaje: 'Empresa eliminada correctamente' });
  } catch (err) {
    return next(err);
  }
};

// Eliminar solo el logo de la empresa
exports.eliminarLogo = async (req, res, next) => {
  try {
    const empresa = await Empresa.findOne({ usuarioId: req.usuario.id });

    if (!empresa) {
      return res.status(404).json({ error: 'No se encontró empresa para este usuario' });
    }

    if (!empresa.logoId && !empresa.logo) {
      return res.status(400).json({ error: 'La empresa no tiene logo para eliminar' });
    }

    if (empresa.logoId) {
      await logoService.eliminarLogo(req.usuario.id, empresa.logoId).catch(() => {});
    }

    empresa.logo = null;
    empresa.logoId = null;
    await empresa.save();

    res.json({ mensaje: 'Logo eliminado correctamente', empresa });
  } catch (err) {
    return next(err);
  }
};

// Servir el logo del usuario autenticado (nunca público)
exports.obtenerLogo = async (req, res, next) => {
  try {
    const empresa = await Empresa.findOne({ usuarioId: req.usuario.id }).select('logoId');

    if (!empresa?.logoId) {
      return res.status(404).json({ error: 'La empresa no tiene logo' });
    }

    const logo = await logoService.abrirLogo(req.usuario.id, empresa.logoId);

    if (!logo) {
      return res.status(404).json({ error: 'Logo no encontrado' });
    }

    res.setHeader('Content-Type', logo.contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=300');

    logo.stream.on('error', () => {
      if (!res.headersSent) res.status(500).end();
    });
    logo.stream.pipe(res);
  } catch (err) {
    return next(err);
  }
};

// Middleware de Multer registrado en las rutas
exports.uploadLogo = subirLogo;
