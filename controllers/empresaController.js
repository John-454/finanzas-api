const Empresa = require('../models/Empresa');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de multer para subir archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/logos';
    // Crear directorio si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generar nombre único: userId_timestamp.ext
    const ext = path.extname(file.originalname);
    const filename = `${req.usuario.id}_${Date.now()}${ext}`;
    cb(null, filename);
  }
});

// Filtro para validar tipos de archivo
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, GIF)'), false);
  }
};

// Middleware de multer
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB límite
  }
});

// Obtener empresa del usuario autenticado
exports.obtenerEmpresa = async (req, res) => {
  try {
    console.log('Obteniendo empresa del usuario:', req.usuario.id);
    
    const empresa = await Empresa.findOne({ usuarioId: req.usuario.id });
    
    if (!empresa) {
      return res.status(404).json({ error: 'No se encontró empresa para este usuario' });
    }

    res.json(empresa);
  } catch (err) {
    console.error('Error al obtener empresa:', err);
    res.status(500).json({ error: err.message });
  }
};

// Crear empresa (solo una por usuario)
exports.crearEmpresa = async (req, res) => {
  try {
    console.log('Creando empresa para usuario:', req.usuario.id);
    
    // Verificar si el usuario ya tiene una empresa
    const empresaExistente = await Empresa.findOne({ usuarioId: req.usuario.id });
    if (empresaExistente) {
      return res.status(400).json({ error: 'El usuario ya tiene una empresa registrada' });
    }

    const { nombre, direccion, ciudad, contacto } = req.body;

    // Validar campos requeridos
    if (!nombre || !direccion || !ciudad || !contacto) {
      return res.status(400).json({ 
        error: 'Todos los campos son requeridos: nombre, direccion, ciudad, contacto' 
      });
    }

    const nuevaEmpresa = new Empresa({
      nombre,
      direccion,
      ciudad,
      contacto,
      logo: req.file ? `/uploads/logos/${req.file.filename}` : null,
      usuarioId: req.usuario.id
    });

    await nuevaEmpresa.save();
    console.log('Empresa creada exitosamente:', nuevaEmpresa._id);

    res.status(201).json(nuevaEmpresa);
  } catch (err) {
    console.error('Error al crear empresa:', err);
    
    // Eliminar archivo si se subió pero falló la creación
    if (req.file) {
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error al eliminar archivo:', unlinkErr);
      });
    }
    
    res.status(400).json({ error: err.message });
  }
};

// Actualizar empresa del usuario
exports.actualizarEmpresa = async (req, res) => {
  try {
    console.log('Actualizando empresa del usuario:', req.usuario.id);

    const empresa = await Empresa.findOne({ usuarioId: req.usuario.id });

    if (!empresa) {
      return res.status(404).json({ error: 'No se encontró empresa para este usuario' });
    }

    const { nombre, direccion, ciudad, contacto } = req.body;

    // Actualizar campos
    if (nombre) empresa.nombre = nombre;
    if (direccion) empresa.direccion = direccion;
    if (ciudad) empresa.ciudad = ciudad;
    if (contacto) empresa.contacto = contacto;

    // Manejar actualización de logo
    if (req.file) {
      // Eliminar logo anterior si existe
      if (empresa.logo) {
        const logoAnterior = path.join(__dirname, '../', empresa.logo);
        fs.unlink(logoAnterior, (err) => {
          if (err) console.error('Error al eliminar logo anterior:', err);
        });
      }
      
      empresa.logo = `/uploads/logos/${req.file.filename}`;
    }

    await empresa.save();
    console.log('Empresa actualizada exitosamente:', empresa._id);

    res.json(empresa);
  } catch (err) {
    console.error('Error al actualizar empresa:', err);
    
    // Eliminar archivo si se subió pero falló la actualización
    if (req.file) {
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error al eliminar archivo:', unlinkErr);
      });
    }
    
    res.status(400).json({ error: err.message });
  }
};

// Eliminar empresa del usuario
exports.eliminarEmpresa = async (req, res) => {
  try {
    console.log('Eliminando empresa del usuario:', req.usuario.id);

    const empresa = await Empresa.findOne({ usuarioId: req.usuario.id });

    if (!empresa) {
      return res.status(404).json({ error: 'No se encontró empresa para este usuario' });
    }

    // Eliminar logo si existe
    if (empresa.logo) {
      const logoPath = path.join(__dirname, '../', empresa.logo);
      fs.unlink(logoPath, (err) => {
        if (err) console.error('Error al eliminar logo:', err);
      });
    }

    await empresa.deleteOne();
    console.log('Empresa eliminada exitosamente');

    res.json({ mensaje: 'Empresa eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar empresa:', err);
    res.status(500).json({ error: err.message });
  }
};

// Eliminar solo el logo de la empresa
exports.eliminarLogo = async (req, res) => {
  try {
    console.log('Eliminando logo de empresa del usuario:', req.usuario.id);

    const empresa = await Empresa.findOne({ usuarioId: req.usuario.id });

    if (!empresa) {
      return res.status(404).json({ error: 'No se encontró empresa para este usuario' });
    }

    if (!empresa.logo) {
      return res.status(400).json({ error: 'La empresa no tiene logo para eliminar' });
    }

    // Eliminar archivo del sistema
    const logoPath = path.join(__dirname, '../', empresa.logo);
    fs.unlink(logoPath, (err) => {
      if (err) console.error('Error al eliminar archivo de logo:', err);
    });

    // Actualizar base de datos
    empresa.logo = null;
    await empresa.save();

    console.log('Logo eliminado exitosamente');
    res.json({ mensaje: 'Logo eliminado correctamente', empresa });
  } catch (err) {
    console.error('Error al eliminar logo:', err);
    res.status(500).json({ error: err.message });
  }
};

// Exportar middleware de multer para uso en las rutas
exports.uploadLogo = upload.single('logo');