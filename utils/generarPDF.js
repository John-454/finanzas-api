const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generarPDF(factura, callback) {
  const doc = new PDFDocument();
  const nombreArchivo = `Factura_${factura.cliente.replace(/\s+/g, '_')}.pdf`;
  const ruta = path.join(__dirname, `../pdfs/${nombreArchivo}`);

  // Asegúrate de que exista la carpeta "pdfs"
  if (!fs.existsSync(path.join(__dirname, '../pdfs'))) {
    fs.mkdirSync(path.join(__dirname, '../pdfs'));
  }

  const stream = fs.createWriteStream(ruta);
  doc.pipe(stream);

  doc.fontSize(20).text('Factura', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Cliente: ${factura.cliente}`);
  doc.text(`Fecha: ${new Date(factura.fecha).toLocaleDateString()}`);
  doc.text(`Total: $${factura.total}`);
  doc.text(`Abono: $${factura.abono}`);
  doc.text(`Saldo: $${factura.saldo}`);
  doc.moveDown().text('Productos:');

  factura.productos.forEach((p, i) => {
    doc.text(`${i + 1}. ${p.nombre} - ${p.cantidad} x $${p.precioUnitario}`);
  });

  doc.end();

  stream.on('finish', () => {
    callback(ruta, nombreArchivo);
  });
}

module.exports = generarPDF;
