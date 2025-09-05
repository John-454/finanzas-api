// server.js
const express = require('express');
const mongoose = require('mongoose');
const facturaRoutes = require('./routes/facturas');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');  
const path = require('path');
require('dotenv').config();

const empresaRoutes = require('./routes/empresa');
const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', facturaRoutes); // << Asegúrate de esto
app.use('/api/empresa/uploads', express.static(path.join(__dirname, 'uploads')));


// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ Conectado a MongoDB"))
  .catch(err => console.error("❌ Error de conexión:", err));

// Rutas (luego las importamos)
app.use('/api/facturas', require('./routes/facturas'));
app.use('/api/contabilidad', require('./routes/contabilidad'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/facturaRoutes', require('./routes/facturas'));
app.use('/api/auth', authRoutes); 
app.use(express.static(path.join(__dirname)));
app.use('/api/empresa', empresaRoutes);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));
