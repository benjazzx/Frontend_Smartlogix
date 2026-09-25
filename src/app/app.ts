import { Component, OnInit, OnDestroy, HostListener, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CognitoAuthService } from './core/auth/cognito-auth.service';
import { AuthService } from './core/services/auth.service';
import { OrdenService } from './features/ordenes/orden.service';
import { ProductoService } from './features/productos/producto.service';
import { ThemeService, AppTheme } from './core/services/theme.service';
import { UsuarioSesion } from './shared/models/models';
import { combineLatest, Subscription } from 'rxjs';
import { ToastComponent } from './shared/components/toast/toast.component';
import { ConfirmModalComponent } from './shared/components/confirm-modal/confirm-modal.component';

interface NavItem {
  label: string;
  route: string;
  iconPath: string;
  roles: string[];
}

interface Notificacion {
  tipo: 'danger' | 'warning' | 'info';
  icono: string;
  texto: string;
  ruta: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, ToastComponent, ConfirmModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'SmartLogix';
  showNotifPanel  = false;
  showThemePicker = false;
  sidebarOpen     = false;
  notificacionesList: Notificacion[] = [];
  private notifSub!: Subscription;

  private readonly allNavItems: NavItem[] = [
    {
      label: 'Dashboard', route: '/dashboard',
      roles: ['admin', 'bodeguero', 'transportista', 'cliente'],
      iconPath: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    },
    {
      label: 'Productos', route: '/productos',
      roles: ['admin', 'bodeguero'],
      iconPath: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    },
    {
      label: 'Inventario', route: '/inventario',
      roles: ['admin', 'bodeguero'],
      iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
    },
    {
      label: 'Órdenes', route: '/ordenes',
      roles: ['admin', 'bodeguero', 'cliente'],
      iconPath: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
    },
    {
      label: 'Envíos', route: '/envios',
      roles: ['admin', 'transportista'],
      iconPath: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
    },
    {
      label: 'Usuarios', route: '/usuarios',
      roles: ['admin'],
      iconPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    },
    {
      label: 'Mi Perfil', route: '/perfil',
      roles: ['cliente'],
      iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    },
  ];

  private readonly cognitoAuth = inject(CognitoAuthService);
  private readonly router = inject(Router);

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    private ordenService: OrdenService,
    private productoService: ProductoService,
  ) {}

  async ngOnInit(): Promise<void> {
    const justLoggedInWithCognito = await this.cognitoAuth.handleRedirectCallback();
    if (justLoggedInWithCognito) {
      this.router.navigate(['/dashboard']);
    }

    if (this.authService.isLoggedIn()) {
      this.themeService.loadFromServer();
    }

    this.notifSub = combineLatest([
      this.ordenService.ordenes$,
      this.productoService.productos$,
    ]).subscribe(([ordenes, productos]) => {
      const lista: Notificacion[] = [];

      const pendientes = ordenes.filter(o => o.estadoActual === 'Pendiente').length;
      if (pendientes > 0) lista.push({
        tipo: 'warning',
        icono: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
        texto: `${pendientes} orden${pendientes !== 1 ? 'es' : ''} pendiente${pendientes !== 1 ? 's' : ''} de procesar`,
        ruta: '/ordenes',
      });

      const enTransito = ordenes.filter(o => o.estadoActual === 'En tránsito').length;
      if (enTransito > 0) lista.push({
        tipo: 'info',
        icono: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
        texto: `${enTransito} envío${enTransito !== 1 ? 's' : ''} activo${enTransito !== 1 ? 's' : ''} en ruta`,
        ruta: '/envios',
      });

      const agotados = productos.filter(p => p.stock === 0).length;
      if (agotados > 0) lista.push({
        tipo: 'danger',
        icono: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
        texto: `${agotados} producto${agotados !== 1 ? 's' : ''} sin stock`,
        ruta: '/productos',
      });

      const stockBajo = productos.filter(p => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 10).length;
      if (stockBajo > 0) lista.push({
        tipo: 'warning',
        icono: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
        texto: `${stockBajo} producto${stockBajo !== 1 ? 's' : ''} con stock bajo`,
        ruta: '/productos',
      });

      Promise.resolve().then(() => { this.notificacionesList = lista; });
    });
  }

  ngOnDestroy(): void { this.notifSub?.unsubscribe(); }

  get notificaciones(): number { return this.notificacionesList.length; }

  toggleNotifPanel(): void {
    this.showNotifPanel = !this.showNotifPanel;
    if (this.showNotifPanel) this.showThemePicker = false;
  }

  toggleThemePicker(): void {
    this.showThemePicker = !this.showThemePicker;
    if (this.showThemePicker) this.showNotifPanel = false;
  }

  selectTheme(theme: AppTheme): void {
    this.themeService.apply(theme);
    this.showThemePicker = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const t = event.target as HTMLElement;
    if (!t.closest('#notif-btn') && !t.closest('#notif-panel')) {
      this.showNotifPanel = false;
    }
    if (!t.closest('#theme-btn') && !t.closest('#theme-panel')) {
      this.showThemePicker = false;
    }
  }

  get currentUser(): UsuarioSesion | null {
    const legacyUser = this.authService.getCurrentUser();
    if (legacyUser) return legacyUser;

    const claims = this.cognitoAuth.getClaims();
    if (!claims) return null;

    const rolNombre = this.cognitoAuth.getRoles()[0] ?? 'cliente';
    return {
      userId: claims.sub,
      correo: claims.email ?? '',
      rolNombre: rolNombre as UsuarioSesion['rolNombre'],
    };
  }

  get navItems(): NavItem[] {
    const rol = this.currentUser?.rolNombre;
    if (!rol) return [];
    return this.allNavItems.filter(item => item.roles.includes(rol));
  }

  get userInitials(): string {
    return this.authService.getInitials(this.currentUser?.correo ?? 'U');
  }

  getRouteTitle(): string {
    if (typeof window === 'undefined') return 'SmartLogix';
    const map: Record<string, string> = {
      dashboard: 'Dashboard', productos: 'Productos', inventario: 'Inventario',
      ordenes: 'Órdenes', envios: 'Envíos', estados: 'Estados', usuarios: 'Usuarios', perfil: 'Mi Perfil',
    };
    return map[window.location.pathname.split('/')[1]] ?? 'SmartLogix';
  }

  logout(): void {
    if (this.cognitoAuth.isLoggedIn()) {
      this.cognitoAuth.logout();
      return;
    }
    this.authService.logout();
  }
}
