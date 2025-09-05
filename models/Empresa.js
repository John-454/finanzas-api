const mongoose = require('mongoose');

const empresaSchema = new mongoose.Schema({
  nombre: { 
    type: String, 
    required: true,
    trim: true 
  },
  direccion: { 
    type: String, 
    required: true,
    trim: true 
  },
  ciudad: { 
    type: String, 
    required: true,
    trim: true 
  },
  contacto: { 
    type: String, 
    required: true,
    trim: true 
  },
  logo: { 
    type: String, // URL o ruta de la imagen
    default: null 
  },
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  }
}, {
  timestamps: true // Agrega createdAt y updatedAt automáticamente
});

// Índice compuesto para asegurar que un usuario solo tenga una empresa
empresaSchema.index({ usuarioId: 1 }, { unique: true });

module.exports = mongoose.model('Empresa', empresaSchema);