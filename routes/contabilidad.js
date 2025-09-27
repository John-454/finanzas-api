const express = require('express');
const router = express.Router();
const contabilidadController = require('../controllers/contabilidadController');
const authMiddleware = require('../middlewares/authMiddleware');

// Rutas para gastos diarios
router.post('/gastos', authMiddleware, contabilidadController.agregarGasto);
router.get('/gastos/:fecha', authMiddleware, contabilidadController.obtenerGastosDia);
router.put('/gastos/:id', authMiddleware, contabilidadController.actualizarGasto);
router.delete('/gastos/:id', authMiddleware, contabilidadController.eliminarGasto);

// Rutas para resúmenes
router.get('/resumen-diario/:fecha', authMiddleware, contabilidadController.resumenDiario);
router.get('/resumen-rango', authMiddleware, contabilidadController.resumenPorRango);

// Mantener ruta original para compatibilidad
router.get('/resumen-mensual', authMiddleware, contabilidadController.resumenMensual);

// Guardar cierre mensual fijo
router.post('/cerrar-mes', authMiddleware, contabilidadController.cerrarMes);
// Historial de cierres mensuales
router.get('/historial-mensual', authMiddleware, contabilidadController.historialMensual);
// Resumen mensual dinámico (no guarda)
router.get('/resumen-mensual/:anio/:mes', authMiddleware, contabilidadController.resumenMensualPorMes);

module.exports = router;