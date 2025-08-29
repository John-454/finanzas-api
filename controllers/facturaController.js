const Factura = require('../models/Factura');
const generarPDF = require('../utils/generarPDF');
const path = require('path');
const fs = require('fs');

exports.crearFactura = async (req, res) => {
  try {
    const { cliente, productos, total, abono = 0 } = req.body;

    const saldo = total - abono;

    const factura = new Factura({
      cliente,
      productos,
      total,
      abono,
      saldo,
      usuarioId: req.usuario._id
    });

    await factura.save();
    generarPDF(factura, (rutaPDF, nombreArchivo) => {
  res.download(rutaPDF, nombreArchivo, (err) => {
    if (err) {
      console.error("Error al enviar el PDF:", err);
      res.status(500).json({ error: "No se pudo generar el PDF" });
    }

    // Opcional: eliminar el archivo PDF después de enviarlo
    //fs.unlink(rutaPDF, () => {});
  });
});

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.obtenerFacturas = async (req, res) => {
  try {
    const facturas = await Factura.find({ usuarioId: req.usuario.id }).sort({ fecha: -1 });
    res.json(facturas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.registrarAbono = async (req, res) => {
  try {
    const facturaId = req.params.id;
    const { abono } = req.body;

    if (typeof abono !== 'number' || abono <= 0) {
      return res.status(400).json({ error: 'El abono debe ser un número mayor a 0.' });
    }

    const factura = await Factura.findById(facturaId);
    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada.' });
    }

    // Actualizar abono y saldo
    factura.abono += abono;
    factura.saldo = factura.total - factura.abono;

     // Agregar al historial
    factura.historialAbonos.push({
      monto: abono,
      fecha: new Date()
    });

    await factura.save();

generarPDF(factura, (rutaPDF, nombreArchivo) => {
  res.download(rutaPDF, nombreArchivo, (err) => {
    if (err) {
      console.error("Error al enviar el PDF:", err);
      res.status(500).json({ error: "No se pudo generar el PDF actualizado." });
    }

    // Eliminar archivo temporal (opcional)
    //fs.unlink(rutaPDF, () => {});
  });
});

  } catch (err) {
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


