import { defineConfig } from 'vitest/config';

// Origen del entorno jsdom para la suite de integración.
// El backend (CORS) solo acepta http://localhost:4200; sin este ajuste jsdom usa
// otro origen y las peticiones fallan con status 0.
export default defineConfig({
  test: {
    environmentOptions: {
      jsdom: { url: 'http://localhost:4200' },
    },
  },
});
