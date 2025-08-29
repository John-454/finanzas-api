const Usuario = require('../models/Usuario');
const jwt = require('jsonwebtoken');

const generarToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secreto123', {
    expiresIn: '30d',
  });
};

// Registrar usuario
exports.registrar = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    const existe = await Usuario.findOne({ email });

    if (existe) {
      return res.status(400).json({ msg: 'El email ya está registrado' });
    }

    const usuario = await Usuario.create({ nombre, email, password });
    res.status(201).json({
      _id: usuario._id,
      nombre: usuario.nombre,
      email: usuario.email,
      token: generarToken(usuario._id),
    });
  } catch (error) {
    res.status(500).json({ msg: 'Error en el servidor', error });
  }
};

// Login usuario
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuario = await Usuario.findOne({ email });

    if (usuario && (await usuario.compararPassword(password))) {
      res.json({
        _id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        token: generarToken(usuario._id),
      });
    } else {
      res.status(400).json({ msg: 'Credenciales inválidas' });
    }
  } catch (error) {
    res.status(500).json({ msg: 'Error en el servidor', error });
  }
};
