import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrdenService } from '../ordenes/orden.service';
import { InventarioService } from '../inventario/inventario.service';
import { ProductoService } from '../productos/producto.service';
import { UsuarioService } from '../usuarios/usuario.service';
import { AuthService } from '../../core/services/auth.service';
import { Orden, Bodega, Producto, Usuario } from '../../shared/models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  ordenes: Orden[] = [];
  bodegas: Bodega[] = [];
  productos: Producto[] = [];
  usuarios: Usuario[] = [];

  cargando = true;

  get ordenesHoy(): number {
    const hoy = new Date().toISOString().split('T')[0];
    return this.ordenes.filter(o => o.fechaOrden?.startsWith(hoy)).length;
  }

  get ordenesPendientes(): Orden[] {
    return this.ordenes.filter(o => o.estadoActual === 'Pendiente');
  }

  get ordenesEnTransito(): Orden[] {
    return this.ordenes.filter(o => o.estadoActual === 'En tránsito');
  }

  get ordenesEntregadas(): Orden[] {
    return this.ordenes.filter(o => o.estadoActual === 'Entregado');
  }

  get bodegasActivas(): Bodega[] {
    return this.bodegas.filter(b => b.activa);
  }

  get productosActivos(): Producto[] {
    return this.productos.filter(p => p.activo);
  }

  get productosStockBajo(): Producto[] {
    return this.productos.filter(p => (p.stock ?? 0) > 0 && (p.stock ?? 0) < 10);
  }

  get productosAgotados(): Producto[] {
    return this.productos.filter(p => (p.stock ?? 0) === 0);
  }

  get ordenesRecientes(): Orden[] {
    return [...this.ordenes]
      .sort((a, b) => new Date(b.fechaOrden ?? 0).getTime() - new Date(a.fechaOrden ?? 0).getTime())
      .slice(0, 6);
  }

  get resumenEstados(): { estado: string; cantidad: number; badge: string }[] {
    const estados = ['Pendiente', 'Procesando', 'Aprobado', 'En tránsito', 'Entregado', 'Cancelado'];
    return estados
      .map(e => ({ estado: e, cantidad: this.ordenes.filter(o => o.estadoActual === e).length, badge: this.getEstadoBadge(e) }))
      .filter(e => e.cantidad > 0);
  }

  constructor(
    private ordenService: OrdenService,
    private inventarioService: InventarioService,
    private productoService: ProductoService,
    private usuarioService: UsuarioService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  get esCliente(): boolean {
    return this.authService.hasRole('cliente');
  }

  get esTransportista(): boolean {
    return this.authService.hasRole('transportista');
  }

  get esAdmin(): boolean {
    return this.authService.hasRole('admin');
  }

  get enviosAprobados(): Orden[] {
    return this.ordenes.filter(o => o.estadoActual === 'Aprobado');
  }

  get enviosCancelados(): Orden[] {
    return this.ordenes.filter(o => o.estadoActual === 'Cancelado');
  }

  get enviosRecientes(): Orden[] {
    return [...this.ordenes]
      .filter(o => ['Aprobado', 'En tránsito', 'Entregado', 'Cancelado'].includes(o.estadoActual ?? ''))
      .sort((a, b) => new Date(b.fechaOrden ?? 0).getTime() - new Date(a.fechaOrden ?? 0).getTime())
      .slice(0, 6);
  }

  ngOnInit(): void {
    if (this.esCliente) {
      this.ordenService.getMisOrdenes().subscribe();
    } else if (this.esTransportista) {
      this.ordenService.getAll().subscribe();
    } else {
      this.ordenService.getAll().subscribe();
      this.inventarioService.getBodegas().subscribe();
      this.productoService.getAll().subscribe();
      // /api/users es solo para admin (el bodeguero recibía 403); el total se muestra solo al admin.
      if (this.esAdmin) {
        this.usuarioService.getAll().subscribe();
      }

      this.inventarioService.bodegas$.subscribe(b => { this.bodegas = b; this.cdr.detectChanges(); });
      this.productoService.productos$.subscribe(p => { this.productos = p; this.cdr.detectChanges(); });
      this.usuarioService.usuarios$.subscribe(u => { this.usuarios = u; this.cdr.detectChanges(); });
    }

    this.ordenService.ordenes$.subscribe(o => { this.ordenes = o; this.cargando = false; this.cdr.detectChanges(); });
  }

  getEstadoBadge(estado?: string): string {
    const map: Record<string, string> = {
      'Pendiente':   'bg-yellow-100 text-yellow-800',
      'Procesando':  'bg-blue-100 text-blue-800',
      'Aprobado':    'bg-indigo-100 text-indigo-800',
      'En tránsito': 'bg-cyan-100 text-cyan-800',
      'Entregado':   'bg-green-100 text-green-800',
      'Cancelado':   'bg-red-100 text-red-800',
    };
    return map[estado ?? ''] ?? 'bg-gray-100 text-gray-600';
  }

  formatCurrency(v: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v ?? 0);
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  getTotalOrdenes(): number {
    return this.ordenes.reduce((sum, o) => sum + (o.total ?? 0), 0);
  }
}
