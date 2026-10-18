// Error con código HTTP y mensaje apto para mostrar al usuario.
export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    Object.assign(this, extra);
  }
}

// Express 4 no captura errores de funciones async: este envoltorio los manda al manejador de errores.
export const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
