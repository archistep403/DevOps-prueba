import { defineConfig } from 'vitest/config';

// Pruebas unitarias del servidor (server/lib, middleware) y de la lógica pura del cliente (src/lib).
// La cobertura se genera en coverage/lcov.info, que SonarCloud lee (rol equivalente a JaCoCo en Java).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: 'coverage',
      include: [
        'server/config.js',
        'server/lib/**/*.js',
        'server/middleware/**/*.js',
        'src/lib/api.js',
        'src/lib/format.js',
        'src/lib/orders.js',
        'src/lib/products.js',
        'src/lib/storage.js',
        'src/lib/validators.js'
      ],
      // Política de calidad: si la cobertura baja de estos umbrales, `npm run test:ci` falla y el pipeline se detiene.
      thresholds: { statements: 85, branches: 80, functions: 85, lines: 85 }
    }
  }
});
