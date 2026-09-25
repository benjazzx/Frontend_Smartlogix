import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { OrdenService } from './orden.service';
import { EstadoOrdenService } from './estado.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ProductoService } from '../productos/producto.service';
import { environment } from '../../../environments/environment';
import { Orden, HistorialEntry, HistorialRequest, Estado, Producto, OrdenRequest } from '../../shared/models/models';

@Component({
  selector: 'app-ordenes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './ordenes.component.html',
})
export class OrdenesComponent implements OnInit {
  ordenes: Orden[] = [];
  estadosDisponibles: Estado[] = [];
  filtroEstado = '';
  showDetalle = false;
  showHistorialModal = false;
  ordenDetalle: Orden | null = null;
  historialForm!: FormGroup;

  get estadoNombres(): string[] {
    return this.estadosDisponibles.map(e => e.nombre);
  }

  get ordenesFiltradas(): Orden[] {
    return this.filtroEstado
      ? this.ordenes.filter(o => o.estadoActual === this.filtroEstado)
      : this.ordenes;
  }

  countByEstado(estado: string): number {
    return this.ordenes.filter(o => o.estadoActual === estado).length;
  }

  // Nuevo pedido
  showNuevoPedido = false;
  productosDisponibles: Producto[] = [];
  carrito: { producto: Producto; cantidad: number }[] = [];
  procesandoOrden = false;
  direccionId: string | null = null;
  paisModal = '';

  get paisesDisponibles(): string[] {
    return [...new Set(this.productosDisponibles.map(p => p.pais ?? 'Chile').filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  get productosModalFiltrados(): Producto[] {
    return this.paisModal
      ? this.productosDisponibles.filter(p => (p.pais ?? 'Chile') === this.paisModal)
      : this.productosDisponibles;
  }

  get esCliente(): boolean   { return this.authService.hasRole('cliente'); }
  get esBodeguero(): boolean { return this.authService.hasRole('bodeguero'); }

  constructor(
    private readonly ordenService: OrdenService,
    private readonly estadoOrdenService: EstadoOrdenService,
    private readonly authService: AuthService,
    private readonly toast: ToastService,
    private readonly confirmService: ConfirmService,
    private readonly fb: FormBuilder,
    private readonly cdr: ChangeDetectorRef,
    private readonly http: HttpClient,
    private readonly productoService: ProductoService,
  ) {}

  ngOnInit(): void {
    this.initHistorialForm();
    this.estadoOrdenService.getAll().subscribe(data => {
      this.estadosDisponibles = data;
      this.cdr.detectChanges();
    });
    if (this.esCliente) {
      this.ordenService.getMisOrdenes().subscribe();
    } else {
      this.ordenService.getAll().subscribe();
    }
    this.ordenService.ordenes$.subscribe(o => {
      this.ordenes = o;
      this.cdr.detectChanges();
    });
  }

  initHistorialForm(): void {
    this.historialForm = this.fb.group({
      estadoId:   ['', Validators.required],
      comentario: [''],
    });
  }

  openDetalle(o: Orden): void {
    this.ordenDetalle = o;
    this.showDetalle = true;
  }

  closeDetalle(): void {
    this.showDetalle = false;
    this.ordenDetalle = null;
  }

  openHistorial(o: Orden): void {
    this.ordenDetalle = o;
    this.initHistorialForm();
    this.showHistorialModal = true;
  }

  closeHistorial(): void {
    this.showHistorialModal = false;
  }

  onSubmitHistorial(): void {
    if (this.historialForm.invalid || !this.ordenDetalle) return;
    const estadoId = this.historialForm.value.estadoId as string;
    const estadoNombre = this.estadosDisponibles.find(e => e.id === estadoId)?.nombre ?? estadoId;
    const dto: HistorialRequest = {
      estadoId,
      estadoNombre,
      comentario: this.historialForm.value.comentario,
    };
    this.ordenService.agregarHistorial(this.ordenDetalle.id, dto).subscribe();
    this.closeHistorial();
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
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  getHistorial(o: Orden): HistorialEntry[] {
    return o.historial ?? [];
  }

  async cancelarOrden(o: Orden): Promise<void> {
    const ok = await this.confirmService.confirm(
      'Cancelar orden',
      `¿Cancelar la orden #${o.id}? Esta acción no se puede deshacer.`,
      { labelAceptar: 'Sí, cancelar', tipo: 'danger' },
    );
    if (!ok) return;
    const estado = this.estadosDisponibles.find(e => e.nombre.toLowerCase() === 'cancelado');
    const dto: HistorialRequest = {
      estadoId:    estado?.id ?? '00000000-0000-0000-0000-000000000006',
      estadoNombre: 'Cancelado',
      comentario:  'Cancelado por el cliente',
    };
    this.ordenService.agregarHistorial(o.id, dto).subscribe({
      next: () => {
        this.toast.success('Orden cancelada', `La orden #${o.id} fue cancelada.`);
        this.ordenService.getMisOrdenes().subscribe();
      },
      error: () => this.toast.error('No se pudo completar la acción', 'Intenta nuevamente.'),
    });
  }

  async confirmarEntrega(o: Orden): Promise<void> {
    const ok = await this.confirmService.confirm(
      'Confirmar recepción',
      `¿Confirmar que recibiste el pedido #${o.id}?`,
      { labelAceptar: 'Sí, confirmar', tipo: 'info' },
    );
    if (!ok) return;
    const estado = this.estadosDisponibles.find(e => e.nombre.toLowerCase() === 'entregado');
    const dto: HistorialRequest = {
      estadoId:    estado?.id ?? '00000000-0000-0000-0000-000000000005',
      estadoNombre: 'Entregado',
      comentario:  'Entrega confirmada por el cliente',
    };
    this.ordenService.agregarHistorial(o.id, dto).subscribe({
      next: () => {
        this.toast.success('¡Recibo confirmado!', `Confirmaste la recepción del pedido #${o.id}.`);
        this.ordenService.getMisOrdenes().subscribe();
      },
      error: () => this.toast.error('No se pudo completar la acción', 'Intenta nuevamente.'),
    });
  }

  puedeCanCelar(o: Orden): boolean {
    return this.esCliente && ['Pendiente', 'Procesando'].includes(o.estadoActual ?? '');
  }

  puedeConfirmar(o: Orden): boolean {
    if (!this.esCliente || o.estadoActual !== 'Entregado') return false;
    return !(o.historial ?? []).some(h => h.comentario === 'Entrega confirmada por el cliente');
  }

  puedeDevolucion(o: Orden): boolean {
    return this.esCliente && o.estadoActual === 'Entregado';
  }

  puedeResolverDevolucion(o: Orden): boolean {
    return !this.esCliente && o.estadoActual === 'Devolución solicitada';
  }

  async resolverDevolucion(o: Orden, aprobada: boolean): Promise<void> {
    if (!aprobada) {
      const ok = await this.confirmService.confirm(
        'Rechazar devolución',
        `¿Rechazar la solicitud de devolución del pedido #${o.id}?`,
        { labelAceptar: 'Rechazar', tipo: 'danger' },
      );
      if (!ok) return;
      this.enviarResolucionDevolucion(o, false, false);
      return;
    }
    const ok = await this.confirmService.confirm(
      'Aprobar devolución',
      `¿Aprobar la devolución del pedido #${o.id}?`,
      { labelAceptar: 'Sí, aprobar', tipo: 'warning' },
    );
    if (!ok) return;
    const danado = await this.confirmService.confirm(
      'Estado del producto',
      '¿El producto llegó dañado? Si es así, se registrará como merma y no volverá al stock disponible.',
      { labelAceptar: 'Sí, está dañado', labelCancelar: 'No, está en buen estado', tipo: 'warning' },
    );
    this.enviarResolucionDevolucion(o, true, danado);
  }

  private enviarResolucionDevolucion(o: Orden, aprobada: boolean, danado: boolean): void {
    this.ordenService.resolverDevolucion(o.id, aprobada, danado).subscribe({
      next: () => {
        this.toast.success(
          aprobada ? 'Devolución aprobada' : 'Devolución rechazada',
          `Se resolvió la devolución del pedido #${o.id}.`,
        );
        if (this.esCliente) this.ordenService.getMisOrdenes().subscribe();
        else this.ordenService.getAll().subscribe();
      },
      error: () => this.toast.error('No se pudo completar la acción', 'Intenta nuevamente.'),
    });
  }

  async solicitarDevolucion(o: Orden): Promise<void> {
    const motivo = await this.confirmService.prompt(
      'Solicitar devolución',
      `¿Cuál es el motivo de la devolución del pedido #${o.id}?`,
      'Ej: producto llegó dañado',
      { labelAceptar: 'Solicitar devolución', tipo: 'warning' },
    );
    if (!motivo) return;
    this.ordenService.solicitarDevolucion(o.id, motivo).subscribe({
      next: () => {
        this.toast.success('Devolución solicitada', `Se registró la solicitud de devolución del pedido #${o.id}.`);
        this.ordenService.getMisOrdenes().subscribe();
      },
      error: () => this.toast.error('No se pudo completar la acción', 'Intenta nuevamente.'),
    });
  }

  // ── Nuevo Pedido ──────────────────────────────────────────────

  abrirNuevoPedido(): void {
    this.carrito = [];
    this.showNuevoPedido = true;
    // Usa /me (accesible a todos los roles) para evitar 403 del endpoint de admin
    this.http.get<any>(`${environment.services.usuarios}/me`).pipe(
      catchError(() => of(null)),
    ).subscribe(user => {
      this.direccionId = user?.direccion?.id ?? (environment as any).direccionPredeterminadaId ?? null;
      this.cdr.detectChanges();
    });
    this.productoService.getAll().subscribe(productos => {
      this.productosDisponibles = productos.filter(p => p.activo !== false && (p.stock ?? 0) > 0);
      this.cdr.detectChanges();
    });
  }

  cerrarNuevoPedido(): void {
    this.showNuevoPedido = false;
    this.carrito = [];
    this.paisModal = '';
  }

  getCantidad(productoId: string): number {
    return this.carrito.find(c => c.producto.id === productoId)?.cantidad ?? 0;
  }

  agregarAlCarrito(p: Producto): void {
    const item = this.carrito.find(c => c.producto.id === p.id);
    if (item) {
      if (item.cantidad < (p.stock ?? 999)) item.cantidad++;
    } else {
      this.carrito = [...this.carrito, { producto: p, cantidad: 1 }];
    }
  }

  quitarDelCarrito(p: Producto): void {
    const idx = this.carrito.findIndex(c => c.producto.id === p.id);
    if (idx === -1) return;
    if (this.carrito[idx].cantidad > 1) {
      const updated = [...this.carrito];
      updated[idx] = { ...updated[idx], cantidad: updated[idx].cantidad - 1 };
      this.carrito = updated;
    } else {
      this.carrito = this.carrito.filter(c => c.producto.id !== p.id);
    }
  }

  totalCarrito(): number {
    return this.carrito.reduce((sum, c) => sum + (c.producto.precio * c.cantidad), 0);
  }

  totalItems(): number {
    return this.carrito.reduce((sum, c) => sum + c.cantidad, 0);
  }

  confirmarPedido(): void {
    if (this.carrito.length === 0 || this.procesandoOrden) return;
    if (!this.direccionId) {
      this.toast.error(
        'Sin dirección registrada',
        'Debes registrar una dirección de entrega en tu perfil antes de hacer un pedido.',
      );
      return;
    }
    this.procesandoOrden = true;
    const user = this.authService.getCurrentUser();
    if (!user) { this.procesandoOrden = false; return; }
    const dto: OrdenRequest = {
      direccionId: this.direccionId,
      userNombre: user.correo,
      detalles: this.carrito.map(c => ({
        productoId: c.producto.id,
        cantidad: c.cantidad,
        productoNombre: c.producto.nombre,
        precioUnitario: c.producto.precio,
      })),
    };
    this.ordenService.crearOrden(dto).subscribe({
      next: () => {
        this.procesandoOrden = false;
        this.cerrarNuevoPedido();
        this.ordenService.getMisOrdenes().subscribe();
      },
      error: () => { this.procesandoOrden = false; this.cdr.detectChanges(); },
    });
  }
}

