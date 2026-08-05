import { Injectable, signal, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, tap, throwError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, UsuarioSesion } from '../../shared/models/models';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'smartlogix_token';
  private readonly USER_KEY  = 'smartlogix_user';

  private isBrowser: boolean;
  private currentUserSubject = new BehaviorSubject<UsuarioSesion | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  isLoggedIn = signal<boolean>(false);

  private readonly mockUsers: Record<string, { token: string; userId: string; rolNombre: LoginResponse['rolNombre']; clave: string }> = {
    'admin@smartlogix.cl':         { token: 'mock-token-admin',         userId: 'uuid-admin-001',         rolNombre: 'admin',         clave: 'admin123'   },
    'bodeguero@smartlogix.cl':     { token: 'mock-token-bodeguero',     userId: 'uuid-bodeguero-001',     rolNombre: 'bodeguero',     clave: 'bodega123'  },
    'transportista@smartlogix.cl': { token: 'mock-token-transportista', userId: 'uuid-transportista-001', rolNombre: 'transportista', clave: 'trans123'   },
    'cliente@smartlogix.cl':       { token: 'mock-token-cliente',       userId: 'uuid-cliente-001',       rolNombre: 'cliente',       clave: 'cliente123' },
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    private toast: ToastService,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    const user = this.loadUser();
    this.currentUserSubject.next(user);
    this.isLoggedIn.set(!!this.getToken());
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.services.auth}/login`, credentials).pipe(
      tap(response => {
        this.storeToken(response.token);
        const session: UsuarioSesion = {
          userId: String(response.userId),
          correo: response.correo,
          rolNombre: response.rolNombre,
        };
        this.storeUser(session);
        this.currentUserSubject.next(session);
        this.isLoggedIn.set(true);
      }),
      catchError(err => {
        const mock = this.mockUsers[credentials.correo];
        if (mock && credentials.clave === mock.clave) {
          this.toast.warning(
            'Modo sin conexión',
            'No se pudo conectar al servidor. Usando sesión local — los cambios no se guardarán en la base de datos.',
          );
          const mockResponse: LoginResponse = {
            token: mock.token, tipo: 'Bearer',
            userId: mock.userId, correo: credentials.correo, rolNombre: mock.rolNombre,
          };
          const session: UsuarioSesion = { userId: mock.userId, correo: credentials.correo, rolNombre: mock.rolNombre };
          this.storeToken(mockResponse.token);
          this.storeUser(session);
          this.currentUserSubject.next(session);
          this.isLoggedIn.set(true);
          return of(mockResponse);
        }
        return throwError(() => err);
      }),
    );
  }

  isMockSession(): boolean {
    const token = this.getToken();
    return !!token && token.startsWith('mock-token-');
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    this.currentUserSubject.next(null);
    this.isLoggedIn.set(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getCurrentUser(): UsuarioSesion | null {
    return this.currentUserSubject.value;
  }

  hasRole(...roles: string[]): boolean {
    const rol = this.currentUserSubject.value?.rolNombre;
    return !!rol && roles.includes(rol);
  }

  private storeToken(token: string): void {
    if (this.isBrowser) localStorage.setItem(this.TOKEN_KEY, token);
  }

  private storeUser(user: UsuarioSesion): void {
    if (this.isBrowser) localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private loadUser(): UsuarioSesion | null {
    if (!this.isBrowser) return null;
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  solicitarRecuperacion(correo: string): Observable<{ solicitudId: string }> {
    return this.http.post<{ solicitudId: string }>('/auth/solicitar-recuperacion', { correo }).pipe(
      catchError(err => throwError(() => err)),
    );
  }

  verificarRecuperacion(solicitudId: string, correo: string, rut: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>('/auth/verificar-recuperacion', { solicitudId, correo, rut }).pipe(
      catchError(err => throwError(() => err)),
    );
  }

  cambiarClave(solicitudId: string, nuevaClave: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>('/auth/cambiar-clave', { solicitudId, nuevaClave }).pipe(
      catchError(err => throwError(() => err)),
    );
  }

  registrar(dto: import('../../shared/models/models').UsuarioRequest): Observable<unknown> {
    return this.http.post(`${environment.services.registro}`, dto).pipe(
      catchError(err => throwError(() => err)),
    );
  }

  getInitials(correo: string): string {
    const name = correo.includes('@') ? correo.split('@')[0] : correo;
    return name.split(/[\s._-]/).slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }
}
