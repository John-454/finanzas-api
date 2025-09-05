const express = require('express');
const router = express.Router();
const facturaController = require('../controllers/facturaController');
const authMiddleware = require('../middlewares/authMiddleware');


router.post('/', authMiddleware, facturaController.crearFactura);
router.get('/', authMiddleware, facturaController.obtenerFacturas);

router.get('/cliente/:nombre', facturaController.obtenerFacturasPorCliente);
router.get('/saldos-pendientes', facturaController.obtenerSaldosPendientes);
router.get('/saldos-pendientes/:cliente', facturaController.obtenerSaldosPendientesPorCliente);
router.patch('/:id/abonar', facturaController.registrarAbono);
router.put('/facturas/:id/abono', facturaController.registrarAbono);

router.get('/detalle/:id', authMiddleware, facturaController.obtenerFacturaPorId);
router.patch('/detalle/:id', authMiddleware, facturaController.actualizarFactura);

router.get('/fecha/:fecha', authMiddleware, facturaController.obtenerFacturasPorFecha);
router.get('/rango', authMiddleware, facturaController.obtenerFacturasPorRango);

module.exports = router;
