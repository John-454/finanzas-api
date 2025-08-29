const express = require('express');
const router = express.Router();
const contabilidadController = require('../controllers/contabilidadController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/resumen-mensual', authMiddleware, contabilidadController.resumenMensual);

module.exports = router;
