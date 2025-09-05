const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, productoController.obtenerProductos);
router.get('/:id', authMiddleware, productoController.obtenerProductoPorId); // También agregué auth aquí por seguridad
router.post('/', authMiddleware, productoController.crearProducto);
router.put('/:id', authMiddleware, productoController.actualizarProducto); // ✅ Agregado authMiddleware
router.delete('/:id', authMiddleware, productoController.eliminarProducto); // ✅ Agregado authMiddleware
router.get('/buscar/nombre', authMiddleware, productoController.buscarPorNombre); // También agregué auth aquí

module.exports = router;