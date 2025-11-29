/**
 * Un logger simple que solo imprime mensajes en la consola durante el modo de desarrollo.
 * En producción, todos los métodos son silenciosos.
 */

const isDevelopment = import.meta.env.MODE === 'development';

const log = (...args: any[]): void => {
  if (isDevelopment) {
    console.log(...args);
  }
};

const warn = (...args: any[]): void => {
  if (isDevelopment) {
    console.warn(...args);
  }
};

const error = (...args: any[]): void => {
  if (isDevelopment) {
    console.error(...args);
  }
};

const Logger = {
  log,
  warn,
  error,
};

export default Logger;