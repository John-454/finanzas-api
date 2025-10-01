// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Importar rutas
const facturaRoutes = require('./routes/facturas');
const movimientosRoutes = require('./routes/movimientos');
const authRoutes = require('./routes/authRoutes');
const empresaRoutes = require('./routes/empresa');

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Servir archivos estáticos - DEBE IR ANTES DE LAS RUTAS DE API
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ Conectado a MongoDB"))
  .catch(err => console.error("❌ Error de conexión:", err));

// Rutas de API
app.use('/api/facturas', facturaRoutes);
app.use('/api/contabilidad', require('./routes/contabilidad'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/auth', authRoutes);
app.use('/api/empresa', empresaRoutes);
app.use('/api/movimientos', movimientosRoutes);

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));