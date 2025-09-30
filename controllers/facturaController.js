const Factura = require('../models/Factura');
const generarPDF = require('../utils/generarPDF');
const path = require('path');
const fs = require('fs');
const MovimientoNequi = require('../models/MovimientoNequi');

exports.crearFactura = async (req, res) => {
  try {
    const { cliente, productos, total, abono = 0, tipoAbono } = req.body;
    const usuarioId = req.usuario.id;
    const saldo = total - abono;

    // Validar tipo de abono si existe un abono inicial
    if (abono > 0) {
      if (!tipoAbono || !['efectivo', 'nequi'].includes(tipoAbono.toLowerCase())) {
        return res.status(400).json({ error: 'Debe especificar un tipo de abono válido: "efectivo" o "nequi".' });
      }
    }

    // Construir historial de abonos inicial
    const historialAbonos = [];
    if (abono > 0) {
      historialAbonos.push({
        monto: abono,
        tipo: tipoAbono.toLowerCase(),
        fecha: new Date()
      });
    }

    const factura = new Factura({
      cliente,
      productos,
      total,
      abono,
      saldo,
      historialAbonos,
      usuarioId
    });

    await factura.save();

    // Registrar movimiento si hay abono inicial
    if (abono > 0) {
      const nuevoMovimiento = new MovimientoNequi({
        fecha: new Date(),
        tipo: 'abono',
        monto: abono,
        metodoPago: tipoAbono.toLowerCase(),
        descripcion: `Abono inicial a factura de ${cliente}`,
        facturaId: factura._id,
        cliente: cliente,
        usuarioId: usuarioId
      });
      
      await nuevoMovimiento.save();
    }

    generarPDF(factura, (rutaPDF, nombreArchivo) => {
      res.download(rutaPDF, nombreArchivo, (err) => {
        if (err) {
          console.error("Error al enviar el PDF:", err);
          res.status(500).json({ error: "No se pudo generar el PDF" });
        }
      });
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


exports.obtenerFacturas = async (req, res) => {
  try {
    console.log('Usuario en request:', req.usuario);
    const facturas = await Factura.find({ usuarioId: req.usuario.id }).sort({ fecha: -1 });
    console.log('Tipo de usuarioId:', typeof req.usuario.id, req.usuario.id);
    res.json(facturas);
  } catch (err) {
    console.error('Error en obtenerFacturas:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.registrarAbono = async (req, res) => {
  try {
    const facturaId = req.params.id;
    const { abono, tipo } = req.body;

    if (typeof abono !== 'number' || abono <= 0) {
      return res.status(400).json({ error: 'El abono debe ser un número mayor a 0.' });
    }

    if (!tipo || !['efectivo', 'nequi'].includes(tipo.toLowerCase())) {
      return res.status(400).json({ error: 'El tipo de abono debe ser "efectivo" o "nequi".' });
    }

    const factura = await Factura.findById(facturaId);
    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada.' });
    }

    // Actualizar abono y saldo
    factura.abono += abono;
    factura.saldo = factura.total - factura.abono;

    // Agregar al historial con tipo
    factura.historialAbonos.push({
      monto: abono,
      tipo: tipo.toLowerCase(),
      fecha: new Date()
    });

    await factura.save();

    // Registrar movimiento del abono
    const nuevoMovimiento = new MovimientoNequi({
      fecha: new Date(),
      tipo: 'abono',
      monto: abono,
      metodoPago: tipo.toLowerCase(),
      descripcion: `Abono a factura de ${factura.cliente}`,
      facturaId: factura._id,
      cliente: factura.cliente,
      usuarioId: factura.usuarioId
    });

    await nuevoMovimiento.save();

    // ✅ CAMBIO: Responder con JSON en lugar de descargar PDF
    res.json({ 
      mensaje: 'Abono registrado correctamente',
      factura: {
        _id: factura._id,
        cliente: factura.cliente,
        total: factura.total,
        abono: factura.abono,
        saldo: factura.saldo
      }
    });

  } catch (err) {
    console.error('Error al registrar abono:', err);
    res.status(500).json({ error: err.message });
  }
};


exports.obtenerFacturasPorCliente = async (req, res) => {
  try {
    const cliente = req.params.nombre;

    const facturas = await Factura.find({ cliente: { $regex: new RegExp(cliente, 'i') } })
      .sort({ fecha: -1 });

    if (facturas.length === 0) {
      return res.status(404).json({ mensaje: `No se encontraron facturas para "${cliente}".` });
    }

    res.json(facturas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.obtenerSaldosPendientes = async (req, res) => {
  try {
    const facturas = await Factura.find({ saldo: { $gt: 0 } }).sort({ fecha: -1 });
    res.json(facturas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.obtenerSaldosPendientesPorCliente = async (req, res) => {
  try {
    const cliente = req.params.cliente;

    const facturas = await Factura.find({
      cliente: { $regex: new RegExp(cliente, 'i') },
      saldo: { $gt: 0 }
    }).sort({ fecha: -1 });

    if (facturas.length === 0) {
      return res.status(404).json({ mensaje: `No hay saldos pendientes para "${cliente}".` });
    }

    res.json(facturas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.obtenerFacturaPorId = async (req, res) => {
  try {
    console.log('=== DEBUG obtenerFacturaPorId ===');
    console.log('req.params:', req.params);
    console.log('req.usuario:', req.usuario);
    
    const facturaId = req.params.id;
    
    // Validar que el ID sea válido
    if (!facturaId || facturaId === 'facturas' || facturaId.length !== 24) {
      return res.status(400).json({ error: 'ID de factura inválido.' });
    }
    
    const usuarioId = req.usuario.id;

    console.log('facturaId:', facturaId);
    console.log('usuarioId:', usuarioId);

    const factura = await Factura.findOne({ 
      _id: facturaId, 
      usuarioId: usuarioId 
    });

    console.log('factura encontrada:', factura);

    if (!factura) {
      console.log('Factura no encontrada');
      return res.status(404).json({ error: 'Factura no encontrada.' });
    }

    console.log('Enviando respuesta exitosa');
    res.json(factura);
  } catch (err) {
    console.error('ERROR en obtenerFacturaPorId:', err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ error: err.message });
  }
};

exports.actualizarFactura = async (req, res) => {
  try {
    const facturaId = req.params.id;
    const { productos } = req.body;
    const usuarioId = req.usuario.id;

    // Validar que el ID sea válido
    if (!facturaId || facturaId.length !== 24) {
      return res.status(400).json({ error: 'ID de factura inválido.' });
    }

    // Validar productos
    if (!Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ error: 'Debe proporcionar al menos un producto.' });
    }

    // Validar cada producto
    for (let producto of productos) {
      if (!producto.nombre || !producto.cantidad || !producto.precioUnitario) {
        return res.status(400).json({ error: 'Todos los productos deben tener nombre, cantidad y precio.' });
      }
      if (producto.cantidad <= 0 || producto.precioUnitario <= 0) {
        return res.status(400).json({ error: 'La cantidad y el precio deben ser mayores a 0.' });
      }
    }

    // Buscar la factura
    const factura = await Factura.findOne({ 
      _id: facturaId, 
      usuarioId: usuarioId 
    });

    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada.' });
    }

    // Calcular nuevo total
    const nuevoTotal = productos.reduce((sum, p) => sum + (p.cantidad * p.precioUnitario), 0);
    
    // Actualizar factura
    factura.productos = productos;
    factura.total = nuevoTotal;
    factura.saldo = nuevoTotal - factura.abono; // Recalcular saldo

    await factura.save();

    // Generar PDF actualizado
    generarPDF(factura, (rutaPDF, nombreArchivo) => {
      res.download(rutaPDF, nombreArchivo, (err) => {
        if (err) {
          console.error("Error al enviar el PDF:", err);
          res.status(500).json({ error: "No se pudo generar el PDF actualizado." });
        }
        // Opcional: eliminar el archivo PDF después de enviarlo
        //fs.unlink(rutaPDF, () => {});
      });
    });

  } catch (err) {
    console.error('Error en actualizarFactura:', err);
    res.status(500).json({ error: err.message });
  }
};

// Función auxiliar (agregar al inicio del archivo)
function crearFechaLocal(fechaString) {
  const [año, mes, dia] = fechaString.split('-').map(Number);
  return new Date(año, mes - 1, dia);
}

// Obtener facturas por fecha específica
exports.obtenerFacturasPorFecha = async (req, res) => {
  try {
    const { fecha } = req.params;
    
    if (!fecha) {
      return res.status(400).json({ error: 'Fecha es requerida (formato: YYYY-MM-DD)' });
    }

    const [year, month, day] = fecha.split('-').map(Number);
const inicioDia = new Date(year, month - 1, day, 0, 0, 0, 0);
const finDia = new Date(year, month - 1, day, 23, 59, 59, 999);

    
    inicioDia.setHours(0, 0, 0, 0);
    
    
    finDia.setHours(23, 59, 59, 999);

    

    const facturas = await Factura.find({
      usuarioId: req.usuario.id,
      fecha: {
        $gte: inicioDia,
        $lte: finDia
      }
    }).sort({ fecha: -1 });

    const resumen = {
      fecha: fecha,
      facturas: facturas,
      totalVentas: facturas.reduce((sum, f) => sum + f.total, 0),
      totalAbonado: facturas.reduce((sum, f) => sum + f.abono, 0),
      saldoPendiente: facturas.reduce((sum, f) => sum + f.saldo, 0),
      cantidadFacturas: facturas.length
    };

    res.json(resumen);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obtener facturas por rango de fechas
exports.obtenerFacturasPorRango = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ 
        error: 'fechaInicio y fechaFin son requeridas (formato: YYYY-MM-DD)' 
      });
    }

    const inicio = new Date(fechaInicio);
    inicio.setHours(0, 0, 0, 0);
    
    const fin = new Date(fechaFin);
    fin.setHours(23, 59, 59, 999);

    const facturas = await Factura.find({
      usuarioId: req.usuario.id,
      fecha: { $gte: inicio, $lte: fin }
    }).sort({ fecha: -1 });

    const resumen = {
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      facturas: facturas,
      totales: {
        totalVentas: facturas.reduce((sum, f) => sum + f.total, 0),
        totalAbonado: facturas.reduce((sum, f) => sum + f.abono, 0),
        saldoPendiente: facturas.reduce((sum, f) => sum + f.saldo, 0),
        cantidadFacturas: facturas.length
      }
    };

    res.json(resumen);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


