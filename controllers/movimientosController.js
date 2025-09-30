const MovimientoNequi = require('../models/MovimientoNequi');
const Factura = require('../models/Factura');
const GastoDiario = require('../models/GastoDiario');
const mongoose = require('mongoose');

// Función auxiliar para crear rango de fechas (reutiliza la del contabilidadController)
function crearRangoLocalUTC(fechaString, offsetHoras = -5) {
  const [year, month, day] = fechaString.split('-').map(Number);
  
  const inicioLocal = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const finLocal = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  
  const inicio = new Date(inicioLocal.getTime() - (offsetHoras * 60 * 60 * 1000));
  const fin = new Date(finLocal.getTime() - (offsetHoras * 60 * 60 * 1000));
  
  return { inicio, fin };
}

// Registrar un movimiento (abono o gasto)
exports.registrarMovimiento = async (req, res) => {
  try {
    const { tipo, monto, metodoPago, descripcion, facturaId, gastoId, cliente, fecha } = req.body;

    // Validaciones
    if (!tipo || !monto || !metodoPago || !descripcion) {
      return res.status(400).json({ 
        error: 'Tipo, monto, método de pago y descripción son obligatorios' 
      });
    }

    if (!['abono', 'gasto'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo debe ser "abono" o "gasto"' });
    }

    if (!['efectivo', 'nequi'].includes(metodoPago)) {
      return res.status(400).json({ error: 'Método de pago debe ser "efectivo" o "nequi"' });
    }

    if (monto <= 0) {
      return res.status(400).json({ error: 'El monto debe ser mayor a cero' });
    }

    // Crear fecha
    let fechaMovimiento;
    if (fecha) {
      const [year, month, day] = fecha.split('-').map(Number);
      fechaMovimiento = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    } else {
      const ahora = new Date();
      fechaMovimiento = new Date(Date.UTC(
        ahora.getUTCFullYear(),
        ahora.getUTCMonth(),
        ahora.getUTCDate(),
        ahora.getUTCHours(),
        ahora.getUTCMinutes(),
        ahora.getUTCSeconds()
      ));
    }

    const nuevoMovimiento = new MovimientoNequi({
      fecha: fechaMovimiento,
      tipo,
      monto: parseFloat(monto),
      metodoPago,
      descripcion: descripcion.trim(),
      facturaId: facturaId || null,
      gastoId: gastoId || null,
      cliente: cliente || null,
      usuarioId: req.usuario.id
    });

    await nuevoMovimiento.save();

    res.status(201).json({
      mensaje: 'Movimiento registrado exitosamente',
      movimiento: nuevoMovimiento
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obtener resumen de movimientos por fecha
exports.obtenerResumenPorFecha = async (req, res) => {
  try {
    const { fecha } = req.params;

    if (!fecha) {
      return res.status(400).json({ error: 'Fecha es requerida (formato: YYYY-MM-DD)' });
    }

    const { inicio: inicioDia, fin: finDia } = crearRangoLocalUTC(fecha);

    console.log('Consultando movimientos para fecha:', fecha);
    console.log('Rango UTC:', inicioDia.toISOString(), 'a', finDia.toISOString());

    // Aggregate para obtener resumen
    const resumen = await MovimientoNequi.aggregate([
      {
        $match: {
          usuarioId: new mongoose.Types.ObjectId(req.usuario.id),
          fecha: { $gte: inicioDia, $lte: finDia }
        }
      },
      {
        $group: {
          _id: {
            tipo: '$tipo',
            metodoPago: '$metodoPago'
          },
          total: { $sum: '$monto' },
          cantidad: { $sum: 1 }
        }
      }
    ]);

    // Procesar resultados
    let abonosEfectivo = 0, abonosNequi = 0;
    let gastosEfectivo = 0, gastosNequi = 0;
    let cantidadAbonosEfectivo = 0, cantidadAbonosNequi = 0;
    let cantidadGastosEfectivo = 0, cantidadGastosNequi = 0;

    resumen.forEach(item => {
      if (item._id.tipo === 'abono' && item._id.metodoPago === 'efectivo') {
        abonosEfectivo = item.total;
        cantidadAbonosEfectivo = item.cantidad;
      } else if (item._id.tipo === 'abono' && item._id.metodoPago === 'nequi') {
        abonosNequi = item.total;
        cantidadAbonosNequi = item.cantidad;
      } else if (item._id.tipo === 'gasto' && item._id.metodoPago === 'efectivo') {
        gastosEfectivo = item.total;
        cantidadGastosEfectivo = item.cantidad;
      } else if (item._id.tipo === 'gasto' && item._id.metodoPago === 'nequi') {
        gastosNequi = item.total;
        cantidadGastosNequi = item.cantidad;
      }
    });

    // Calcular totales
    const totalAbonos = abonosEfectivo + abonosNequi;
    const totalGastos = gastosEfectivo + gastosNequi;
    const saldoEfectivo = abonosEfectivo - gastosEfectivo;
    const saldoNequi = abonosNequi - gastosNequi;
    const saldoTotal = totalAbonos - totalGastos;

    res.json({
      fecha,
      abonos: {
        efectivo: abonosEfectivo,
        nequi: abonosNequi,
        total: totalAbonos,
        cantidadEfectivo: cantidadAbonosEfectivo,
        cantidadNequi: cantidadAbonosNequi
      },
      gastos: {
        efectivo: gastosEfectivo,
        nequi: gastosNequi,
        total: totalGastos,
        cantidadEfectivo: cantidadGastosEfectivo,
        cantidadNequi: cantidadGastosNequi
      },
      saldos: {
        efectivo: saldoEfectivo,
        nequi: saldoNequi,
        total: saldoTotal
      }
    });

  } catch (err) {
    console.error('Error al obtener resumen:', err);
    res.status(500).json({ error: err.message });
  }
};

// Obtener movimientos detallados por fecha
exports.obtenerMovimientosPorFecha = async (req, res) => {
  try {
    const { fecha } = req.params;

    if (!fecha) {
      return res.status(400).json({ error: 'Fecha es requerida (formato: YYYY-MM-DD)' });
    }

    const { inicio: inicioDia, fin: finDia } = crearRangoLocalUTC(fecha);

    const movimientos = await MovimientoNequi.find({
      usuarioId: req.usuario.id,
      fecha: { $gte: inicioDia, $lte: finDia }
    })
    .populate('facturaId', 'cliente total')
    .populate('gastoId', 'descripcion categoria')
    .sort({ fecha: -1 });

    res.json({
      fecha,
      cantidad: movimientos.length,
      movimientos
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obtener resumen por rango de fechas
exports.obtenerResumenPorRango = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ 
        error: 'fechaInicio y fechaFin son requeridas (formato: YYYY-MM-DD)' 
      });
    }

    const { inicio } = crearRangoLocalUTC(fechaInicio);
    const { fin } = crearRangoLocalUTC(fechaFin);

    // Aggregate por día
    const movimientosPorDia = await MovimientoNequi.aggregate([
      {
        $match: {
          usuarioId: new mongoose.Types.ObjectId(req.usuario.id),
          fecha: { $gte: inicio, $lte: fin }
        }
      },
      {
        $group: {
          _id: {
            año: { $year: '$fecha' },
            mes: { $month: '$fecha' },
            dia: { $dayOfMonth: '$fecha' },
            tipo: '$tipo',
            metodoPago: '$metodoPago'
          },
          total: { $sum: '$monto' },
          cantidad: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.año': -1, '_id.mes': -1, '_id.dia': -1 }
      }
    ]);

    // Procesar resultados por día
    const resumenPorDia = {};

    movimientosPorDia.forEach(item => {
      const fechaKey = `${item._id.año}-${String(item._id.mes).padStart(2, '0')}-${String(item._id.dia).padStart(2, '0')}`;
      
      if (!resumenPorDia[fechaKey]) {
        resumenPorDia[fechaKey] = {
          fecha: fechaKey,
          abonos: { efectivo: 0, nequi: 0, total: 0 },
          gastos: { efectivo: 0, nequi: 0, total: 0 },
          saldos: { efectivo: 0, nequi: 0, total: 0 }
        };
      }

      if (item._id.tipo === 'abono') {
        if (item._id.metodoPago === 'efectivo') {
          resumenPorDia[fechaKey].abonos.efectivo = item.total;
        } else {
          resumenPorDia[fechaKey].abonos.nequi = item.total;
        }
      } else {
        if (item._id.metodoPago === 'efectivo') {
          resumenPorDia[fechaKey].gastos.efectivo = item.total;
        } else {
          resumenPorDia[fechaKey].gastos.nequi = item.total;
        }
      }
    });

    // Calcular totales por día
    Object.values(resumenPorDia).forEach(dia => {
      dia.abonos.total = dia.abonos.efectivo + dia.abonos.nequi;
      dia.gastos.total = dia.gastos.efectivo + dia.gastos.nequi;
      dia.saldos.efectivo = dia.abonos.efectivo - dia.gastos.efectivo;
      dia.saldos.nequi = dia.abonos.nequi - dia.gastos.nequi;
      dia.saldos.total = dia.abonos.total - dia.gastos.total;
    });

    res.json({
      fechaInicio,
      fechaFin,
      resumenPorDia: Object.values(resumenPorDia)
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Eliminar un movimiento
exports.eliminarMovimiento = async (req, res) => {
  try {
    const { id } = req.params;

    const movimiento = await MovimientoNequi.findOneAndDelete({
      _id: id,
      usuarioId: req.usuario.id
    });

    if (!movimiento) {
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }

    res.json({
      mensaje: 'Movimiento eliminado exitosamente',
      movimiento
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = exports;