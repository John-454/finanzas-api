'use strict';

// Helpers compartidos para los tests (sin dependencias externas).

// Res falsa de Express: captura status() y json()
function crearRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

// Reemplaza estáticos de un modelo (p. ej. GastoDiario.findById) y permite restaurarlos.
function crearMockEstatico(obj) {
  const originales = new Map();
  return {
    set(nombre, fn) {
      if (!originales.has(nombre)) {
        originales.set(nombre, {
          propio: Object.prototype.hasOwnProperty.call(obj, nombre),
          valor: obj[nombre],
        });
      }
      obj[nombre] = fn;
    },
    restaurar() {
      for (const [nombre, { propio, valor }] of originales) {
        if (propio) obj[nombre] = valor;
        else delete obj[nombre];
      }
      originales.clear();
    },
  };
}

module.exports = { crearRes, crearMockEstatico };
