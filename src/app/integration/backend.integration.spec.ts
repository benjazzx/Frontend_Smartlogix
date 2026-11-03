import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../environments/environment';
import { authInterceptor } from '../core/interceptors/auth.interceptor';
import { cognitoInterceptor } from '../core/interceptors/cognito.interceptor';
import { errorInterceptor } from '../core/interceptors/error.interceptor';

/**
 * Pruebas de integración CONTRA EL BACKEND (no corren con `npm test`):
 *   npm run test:integration
 *
 * Notas:
 * - Usa el backend local en localhost:80 (mismo destino que el proxy de dev).
 *   El API Gateway de AWS (environment.apiGateway) no resuelve por DNS desde esta red.
 * - El origen jsdom se fija en http://localhost:4200 (vitest.integration.config.mts),
 *   porque el backend solo acepta CORS desde ese origen.
 * - El login tiene rate limit (429). Por eso cada cuenta se autentica UNA sola vez
 *   en beforeAll y los tests reutilizan el token.
 */

const BASE = 'http://localhost:80';
const LOGIN_URL = `${BASE}${environment.services.auth}/login`;

const CUENTAS = {
  cliente: { correo: 'cliente@smartlogix.cl', clave: 'cliente123', rol: 'cliente' },
  admin: { correo: 'admin@smartlogix.cl', clave: 'admin123', rol: 'admin' },
};

interface LoginResp {
  token: string;
  tipo: string;
  userId: string;
  correo: string;
  rolNombre: string;
}

const logins: Partial<Record<keyof typeof CUENTAS, LoginResp>> = {};

/**
 * Login con reintento ante 429: el backend limita intentos de login por minuto
 * y espera ~1 minuto antes de aceptar otro.
 */
async function loginWithRetry(http: HttpClient, correo: string, clave: string): Promise<LoginResp> {
  const MAX_INTENTOS = 3;
  for (let intento = 1; ; intento++) {
    try {
      return await firstValueFrom(http.post<LoginResp>(LOGIN_URL, { correo, clave }));
    } catch (e) {
      const rateLimited = e instanceof HttpErrorResponse && e.status === 429;
      if (!rateLimited || intento >= MAX_INTENTOS) throw e;
      await new Promise(resolve => setTimeout(resolve, 65000));
    }
  }
}

async function statusOf(promise: Promise<unknown>): Promise<number> {
  try {
    await promise;
    return 200;
  } catch (e) {
    if (e instanceof HttpErrorResponse) return e.status;
    throw e;
  }
}

describe('Backend integration (live)', () => {
  let http: HttpClient;

  beforeAll(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        // Ruta /login para que el redirect de errorInterceptor no falle en el router.
        provideRouter([{ path: 'login', children: [] }]),
        provideHttpClient(withInterceptors([authInterceptor, cognitoInterceptor, errorInterceptor])),
      ],
    });
    const plain = TestBed.inject(HttpClient);
    for (const key of Object.keys(CUENTAS) as (keyof typeof CUENTAS)[]) {
      const c = CUENTAS[key];
      try {
        const resp = await loginWithRetry(plain, c.correo, c.clave);
        logins[key] = resp;
      } catch {
        // Cada cuenta falla de forma independiente; el test correspondiente reporta el fallo.
      }
    }
  }, 300000);

  beforeEach(() => {
    http = TestBed.inject(HttpClient);
    localStorage.removeItem('smartlogix_token');
    localStorage.removeItem('cognito_id_token');
  });

  it('login with cliente credentials returns a token and the cliente role', async () => {
    const resp = logins.cliente;
    expect(resp?.token, 'login de cliente en beforeAll').toBeTruthy();
    expect(resp!.userId).toBeTruthy();
    expect(resp!.correo).toBe(CUENTAS.cliente.correo);
    expect(resp!.rolNombre).toBe(CUENTAS.cliente.rol);
  });

  it('login with a wrong password is rejected (400/401/403), not a server error', async () => {
    const status = await statusOf(
      firstValueFrom(http.post(LOGIN_URL, { correo: CUENTAS.cliente.correo, clave: 'incorrecta-123' })),
    );
    expect([400, 401, 403, 429]).toContain(status);
    expect(status).not.toBe(0);
  });

  it('a protected endpoint rejects requests without a token', async () => {
    const status = await statusOf(firstValueFrom(http.get(`${BASE}${environment.services.usuarios}`)));
    expect([401, 403]).toContain(status);
  });

  it('the stored session token is accepted by the interceptor chain', async () => {
    expect(logins.cliente?.token).toBeTruthy();
    // Flujo real: el token queda en localStorage y authInterceptor lo adjunta.
    localStorage.setItem('smartlogix_token', logins.cliente?.token!);

    const status = await statusOf(firstValueFrom(http.get(`${BASE}${environment.services.productos}`)));
    expect(status).toBe(200);
  });

  it('a cliente cannot list all users (role enforced by the backend)', async () => {
    expect(logins.cliente?.token).toBeTruthy();
    localStorage.setItem('smartlogix_token', logins.cliente?.token!);

    const status = await statusOf(firstValueFrom(http.get(`${BASE}${environment.services.usuarios}`)));
    expect([401, 403]).toContain(status);
  });

  it('an admin can list users', async () => {
    expect(logins.admin?.token, 'token de admin obtenido en beforeAll').toBeTruthy();
    localStorage.setItem('smartlogix_token', logins.admin?.token!);

    const usuarios = await firstValueFrom(http.get<unknown[]>(`${BASE}${environment.services.usuarios}`));
    expect(Array.isArray(usuarios)).toBe(true);
  });
});
