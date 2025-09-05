const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  const authHeader = req.headers['authorization'];
  console.log('Authorization header:', req.headers['authorization']);
  // Extraer el token quitando el prefijo "Bearer "
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  if (!token) return res.status(403).json({ error: 'Acceso denegado' });

  try {
    const verificado = jwt.verify(token, process.env.JWT_SECRET || 'secreto123');
    req.usuario = verificado; // Guardamos datos del usuario en la request
    console.log('Usuario verificado:', verificado);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
};
