const express = require('express');
const router = express.Router();
const { registrar, login } = require('../controllers/authController');
const { limiteLogin, limiteRegistro } = require('../middlewares/rateLimit');

// Registro y Login (con límite de intentos)
router.post('/register', limiteRegistro, registrar);
router.post('/login', limiteLogin, login);

module.exports = router;
