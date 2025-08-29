const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ error: 'Acceso denegado' });

  try {
    const verificado = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
    req.usuario = verificado; // Guardamos datos del usuario en la request
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
};
