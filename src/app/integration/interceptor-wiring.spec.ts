import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../environments/environment';
import { authInterceptor } from '../core/interceptors/auth.interceptor';
import { cognitoInterceptor } from '../core/interceptors/cognito.interceptor';
import { errorInterceptor } from '../core/interceptors/error.interceptor';
import { roleGuard } from '../core/guards/role.guard';
import { CognitoAuthService } from '../core/auth/cognito-auth.service';
import { AuthService } from '../core/services/auth.service';
import { ToastService } from '../core/services/toast.service';

/**
 * Pruebas de integración "offline": ejercitan la cadena real de interceptores,
 * guards y servicios de sesión contra HttpTestingController (sin red).
 * Se ejecutan con `npm test`.
 */

const SMARTLOGIX_TOKEN = 'smartlogix-token-test';
const COGNITO_ID_TOKEN = makeJwt({ sub: 'user-123', email: 'x@y.cl', exp: futureExp(), 'cognito:groups': ['OPERADOR'] });

function makeJwt(claims: Record<string, unknown>): string {
  const b64 = (o: object) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64(claims)}.sig`;
}

function futureExp(): number {
  return Math.floor(Date.now() / 1000) + 3600;
}

function setupTestBed(): void {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptor, cognitoInterceptor, errorInterceptor])),
      provideHttpClientTesting(),
    ],
  });
}

describe('Interceptor wiring (offline)', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: Router;
  let toast: ToastService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setupTestBed();
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    toast = TestBed.inject(ToastService);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('adds the SmartLogix session token to API requests', () => {
    localStorage.setItem('smartlogix_token', SMARTLOGIX_TOKEN);

    http.get(`${environment.services.usuarios}`).subscribe();

    const req = httpMock.expectOne(environment.services.usuarios);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${SMARTLOGIX_TOKEN}`);
    req.flush([]);
  });

  it('never sends a Cognito token to /auth/* routes (absolute gateway URL)', () => {
    localStorage.setItem('cognito_id_token', COGNITO_ID_TOKEN);
    const url = `${environment.apiGateway}${environment.services.auth}/login`;

    http.post(url, { correo: 'a@b.cl', clave: '123456' }).subscribe({ error: () => {} });

    const req = httpMock.expectOne(url);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });
  });

  it('attaches the Cognito ID token to /api/ordenes on the absolute gateway URL', () => {
    localStorage.setItem('cognito_id_token', COGNITO_ID_TOKEN);
    const url = `${environment.apiGateway}/api/ordenes`;

    http.get(url).subscribe();

    const req = httpMock.expectOne(url);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${COGNITO_ID_TOKEN}`);
    req.flush([]);
  });

  /**
   * Detecta un problema de integración real: en `environment.ts` los servicios
   * usan rutas relativas ("/api/ordenes"), y cognitoInterceptor solo adjunta el
   * token si la URL empieza con `environment.apiGateway`. Este test FALLA hoy
   * y debe pasar una vez se unifique la forma de construir las URLs.
   */
  it('attaches the Cognito ID token to /api/ordenes when the URL is relative (dev config)', () => {
    localStorage.setItem('cognito_id_token', COGNITO_ID_TOKEN);

    http.get('/api/ordenes').subscribe();

    const req = httpMock.expectOne('/api/ordenes');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${COGNITO_ID_TOKEN}`);
    req.flush([]);
  });

  it('logs out and redirects to /login on 401 from a general API route', () => {
    localStorage.setItem('smartlogix_token', SMARTLOGIX_TOKEN);
    localStorage.setItem('smartlogix_user', JSON.stringify({ userId: '1', correo: 'a@b.cl', rolNombre: 'admin' }));
    const auth = TestBed.inject(AuthService);

    http.get(environment.services.usuarios).subscribe({ error: () => {} });
    httpMock
      .expectOne(environment.services.usuarios)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem('smartlogix_token')).toBeNull();
    expect(auth.isLoggedIn()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('shows a Cognito warning instead of logging out on 401 from /api/ordenes without a Cognito session', () => {
    const warning = vi.spyOn(toast, 'warning');
    localStorage.setItem('smartlogix_token', SMARTLOGIX_TOKEN);

    http.get('/api/ordenes').subscribe({ error: () => {} });
    httpMock.expectOne('/api/ordenes').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(warning).toHaveBeenCalledWith(
      'Requiere sesión de AWS Cognito',
      expect.any(String),
    );
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('shows a permission error on a 403 for a write request', () => {
    const error = vi.spyOn(toast, 'error');
    localStorage.setItem('smartlogix_token', SMARTLOGIX_TOKEN);

    http.post(environment.services.usuarios, {}).subscribe({ error: () => {} });
    httpMock
      .expectOne(environment.services.usuarios)
      .flush({}, { status: 403, statusText: 'Forbidden' });

    expect(error).toHaveBeenCalledWith('Sin permiso', expect.any(String));
  });
});

describe('Role resolution across sessions (offline)', () => {
  beforeEach(() => {
    localStorage.clear();
    setupTestBed();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('maps the Cognito OPERADOR group to the bodeguero role', () => {
    localStorage.setItem('cognito_id_token', COGNITO_ID_TOKEN);
    const cognito = TestBed.inject(CognitoAuthService);

    expect(cognito.getRoles()).toEqual(['bodeguero']);
    expect(cognito.hasRole('bodeguero')).toBe(true);
  });

  it('lets a Cognito-only bodeguero pass roleGuard on /productos', () => {
    localStorage.setItem('cognito_id_token', COGNITO_ID_TOKEN);
    const route = { data: { roles: ['admin', 'bodeguero'] } } as unknown as ActivatedRouteSnapshot;

    const allowed = TestBed.runInInjectionContext(() =>
      roleGuard(route, {} as RouterStateSnapshot),
    );

    expect(allowed).toBe(true);
  });

  it('blocks a Cognito-only bodeguero from /usuarios (admin only)', () => {
    localStorage.setItem('cognito_id_token', COGNITO_ID_TOKEN);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const route = { data: { roles: ['admin'] } } as unknown as ActivatedRouteSnapshot;

    const allowed = TestBed.runInInjectionContext(() =>
      roleGuard(route, {} as RouterStateSnapshot),
    );

    expect(allowed).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
