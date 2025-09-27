const mongoose = require('mongoose');

const ResumenMensualSchema = new mongoose.Schema({
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  anio: { type: Number, required: true },
  mes: { type: Number, required: true }, // 1-12
  totalVentas: { type: Number, default: 0 },
  totalAbonos: { type: Number, default: 0 },
  totalGastos: { type: Number, default: 0 },
  saldoNeto: { type: Number, default: 0 },
  creadoEn: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ResumenMensual', ResumenMensualSchema);
