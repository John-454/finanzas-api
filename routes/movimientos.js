const express = require('express');
const router = express.Router();
const movimientosController = require('../controllers/movimientosController');
const auth = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación - aplicar solo UNA VEZ
router.use(auth);

// Registrar un nuevo movimiento (manual)
router.post('/', movimientosController.registrarMovimiento);

// Obtener resumen de movimientos por fecha específica
router.get('/resumen/:fecha', movimientosController.obtenerResumenPorFecha);

// Obtener movimientos detallados por fecha
router.get('/detalle/:fecha', movimientosController.obtenerMovimientosPorFecha);

// Obtener resumen por rango de fechas
router.get('/resumen-rango', movimientosController.obtenerResumenPorRango);

// Eliminar un movimiento
router.delete('/:id', movimientosController.eliminarMovimiento);

module.exports = router;