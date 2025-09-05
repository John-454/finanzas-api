const express = require('express');
const router = express.Router();
const empresaController = require('../controllers/empresaController');
const authMiddleware = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// GET /api/empresas - Obtener empresa del usuario autenticado
router.get('/', empresaController.obtenerEmpresa);

// POST /api/empresas - Crear nueva empresa (con logo opcional)
router.post('/', 
  empresaController.uploadLogo, // Middleware para subir archivo
  empresaController.crearEmpresa
);

// PUT /api/empresas - Actualizar empresa del usuario (con logo opcional)
router.put('/', 
  empresaController.uploadLogo, // Middleware para subir archivo
  empresaController.actualizarEmpresa
);

// DELETE /api/empresas - Eliminar empresa del usuario
router.delete('/', empresaController.eliminarEmpresa);

// DELETE /api/empresas/logo - Eliminar solo el logo de la empresa
router.delete('/logo', empresaController.eliminarLogo);

module.exports = router;