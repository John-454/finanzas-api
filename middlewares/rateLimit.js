'use strict';

// CS-2026-004: límite de intentos en autenticación para frenar fuerza bruta
// y credential stuffing.

const rateLimit = require('express-rate-limit');

const ventanaMs = 15 * 60 * 1000; // 15 minutos

/** Clave de límite: IP + email normalizado (no bloquea toda una red) */
function claveLogin(req) {
  const email = String(req.body?.email || '')
    .toLowerCase()
    .trim();
  return `${req.ip}|${email}`;
}

/**
 * Límite para login: 10 intentos por IP + email en 15 min.
 * Los intentos exitosos no cuentan.
 */
const limiteLogin = rateLimit({
  windowMs: ventanaMs,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: claveLogin,
  handler: (req, res) => {
    res.status(429).json({
      msg: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
    });
  },
  skipSuccessfulRequests: true,
});

/**
 * Límite para registro: 5 cuentas por IP en 15 min.
 */
const limiteRegistro = rateLimit({
  windowMs: ventanaMs,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      msg: 'Demasiadas cuentas creadas desde esta red. Inténtalo más tarde.',
    });
  },
});

module.exports = { limiteLogin, limiteRegistro, claveLogin };
