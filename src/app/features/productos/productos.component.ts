import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductoService } from './producto.service';
import { InventarioService } from '../inventario/inventario.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { Producto, ProductoRequest, Categoria, Bodega, Pasillo, Estante, HistorialStock } from '../../shared/models/models';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './productos.component.html',
})
export class ProductosComponent implements OnInit {
  activeTab: 'productos' | 'categorias' = 'productos';

  // Productos
  productos:  Producto[]  = [];
  categorias: Categoria[] = [];
  filtro        = '';
  filtroPais    = '';
  filtroBodegaId: number | null = null;
  showModal   = false;
  editando:   Producto | null = null;
  form!: FormGroup;

  // Imagen
  imagenFile:      File | null = null;
  imagenPreview:   string | null = null;
  productoImagenId: string | null = null;
  showImagenModal  = false;
  subiendoImagen   = false;

  // Ubicación
  bodegas:            Bodega[]  = [];
  allPasillos:        Pasillo[] = [];
  allEstantes:        Estante[] = [];
  pasillosFiltrados:  Pasillo[] = [];
  estantesFiltrados:  Estante[] = [];

  // Categorías
  showCategoriaModal  = false;
  categoriaEditando:  Categoria | null = null;
  categoriaForm!: FormGroup;

  // Historial de auditoría
  showHistorialModal   = false;
  historialProducto:   Producto | null = null;
  historial:           HistorialStock[] = [];
  cargandoHistorial    = false;

  get paisesList(): string[] {
    return [...new Set(this.productos.map(p => p.pais ?? 'Chile').filter(Boolean))].sort();
  }

  get productosFiltrados(): Producto[] {
    const q = this.filtro.toLowerCase();
    return this.productos.filter(p => {
      if (q && !p.nombre.toLowerCase().includes(q) && !(p.categoriaNombre ?? '').toLowerCase().includes(q)) return false;
      if (this.filtroPais && (p.pais ?? 'Chile') !== this.filtroPais) return false;
      if (this.filtroBodegaId && p.idBodega !== +this.filtroBodegaId) return false;
      return true;
    });
  }

  constructor(
    private productoService:   ProductoService,
    private inventarioService: InventarioService,
    private readonly confirmService: ConfirmService,
    private readonly toast: ToastService,
    private fb:  FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.productoService.getCategorias().subscribe();
    this.productoService.getAll().subscribe();
    this.productoService.productos$.subscribe(p  => { this.productos  = p;  this.cdr.detectChanges(); });
    this.productoService.categorias$.subscribe(c => { this.categorias = c;  this.cdr.detectChanges(); });

    this.inventarioService.getBodegas().subscribe();
    this.inventarioService.getPasillos().subscribe();
    this.inventarioService.getEstantes().subscribe();
    this.inventarioService.bodegas$.subscribe(b  => { this.bodegas     = b; this.cdr.detectChanges(); });
    this.inventarioService.pasillos$.subscribe(p => { this.allPasillos = p; this.cdr.detectChanges(); });
    this.inventarioService.estantes$.subscribe(e => { this.allEstantes = e; this.cdr.detectChanges(); });
  }

  // ── PRODUCTOS ────────────────────────────────────────────────────────────

  initForm(p?: Producto): void {
    this.form = this.fb.group({
      nombre:      [p?.nombre      ?? '', [Validators.required, Validators.maxLength(200)]],
      descripcion: [p?.descripcion ?? ''],
      precio:      [p?.precio      ?? '',  [Validators.required, Validators.min(1)]],
      stock:       [p?.stock       ?? 0,   [Validators.required, Validators.min(0)]],
      categoriaId: [p?.categoriaId ?? '', [Validators.required]],
      pais:        [p?.pais        ?? 'Chile'],
      idBodega:    [p?.idBodega    ?? null],
      idPasillo:   [p?.idPasillo   ?? null],
      idEstante:   [p?.idEstante   ?? null],
    });
  }

  openNew(): void {
    this.editando = null;
    this.pasillosFiltrados = [];
    this.estantesFiltrados = [];
    this.imagenFile    = null;
    this.imagenPreview = null;
    this.initForm();
    this.showModal = true;
  }

  openEdit(p: Producto): void {
    this.editando = p;
    this.pasillosFiltrados = [];
    this.estantesFiltrados = [];
    this.imagenFile    = null;
    this.imagenPreview = p.imagenUrl ?? null;
    this.initForm(p);
    this.showModal = true;
    if (p.idBodega) {
      this.inventarioService.getPasillosByBodega(p.idBodega).subscribe(pasillos => {
        this.pasillosFiltrados = pasillos; this.cdr.detectChanges();
      });
    }
    if (p.idPasillo) {
      this.inventarioService.getEstantesByPasillo(p.idPasillo).subscribe(estantes => {
        this.estantesFiltrados = estantes; this.cdr.detectChanges();
      });
    }
  }

  closeModal(): void {
    this.showModal = false;
    this.editando  = null;
    this.imagenFile    = null;
    this.imagenPreview = null;
  }

  onBodegaChange(): void {
    const bodegaId = this.form.get('idBodega')?.value;
    this.form.patchValue({ idPasillo: null, idEstante: null });
    this.pasillosFiltrados = [];
    this.estantesFiltrados = [];
    if (bodegaId) {
      this.inventarioService.getPasillosByBodega(+bodegaId).subscribe(pasillos => {
        this.pasillosFiltrados = pasillos; this.cdr.detectChanges();
      });
    }
  }

  onPasilloChange(): void {
    const pasilloId = this.form.get('idPasillo')?.value;
    this.form.patchValue({ idEstante: null });
    this.estantesFiltrados = [];
    if (pasilloId) {
      this.inventarioService.getEstantesByPasillo(+pasilloId).subscribe(estantes => {
        this.estantesFiltrados = estantes; this.cdr.detectChanges();
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    const dto: ProductoRequest = {
      nombre:      v.nombre,
      descripcion: v.descripcion,
      precio:      +v.precio,
      stock:       +v.stock,
      categoriaId: v.categoriaId,
      pais:        v.pais || 'Chile',
      idBodega:    v.idBodega  ? +v.idBodega  : undefined,
      idPasillo:   v.idPasillo ? +v.idPasillo : undefined,
      idEstante:   v.idEstante ? +v.idEstante : undefined,
    };
    const file = this.imagenFile;
    if (this.editando) {
      this.productoService.update(this.editando.id, dto).subscribe(updated => {
        if (file && updated) this.productoService.subirImagen(updated.id, file).subscribe();
      });
    } else {
      this.productoService.create(dto).subscribe(created => {
        if (file && created) this.productoService.subirImagen(created.id, file).subscribe();
      });
    }
    this.closeModal();
  }

  async onDelete(id: string): Promise<void> {
    const ok = await this.confirmService.confirm(
      'Eliminar producto',
      'Esta acción eliminará el producto permanentemente.',
      { labelAceptar: 'Eliminar', tipo: 'danger' },
    );
    if (!ok) return;
    this.productoService.delete(id).subscribe();
  }

  toggleActivo(p: Producto): void { this.productoService.toggleActivo(p.id).subscribe(); }

  getUbicacion(p: Producto): string {
    if (!p.idBodega) return '—';
    const bodega  = this.bodegas.find(b => b.idBodega === p.idBodega)?.nombre ?? `B${p.idBodega}`;
    const pasillo = p.idPasillo ? (this.allPasillos.find(pa => pa.idPasillo === p.idPasillo)?.codigo ?? `P${p.idPasillo}`) : null;
    const estante = p.idEstante ? (this.allEstantes.find(e => e.idEstante === p.idEstante)?.codigo ?? `E${p.idEstante}`) : null;
    return [bodega, pasillo, estante].filter(Boolean).join(' › ');
  }

  // Imagen
  abrirImagenModal(p: Producto): void {
    this.productoImagenId  = p.id;
    this.imagenFile        = null;
    this.imagenPreview     = p.imagenUrl ?? null;
    this.showImagenModal   = true;
  }

  cerrarImagenModal(): void {
    this.showImagenModal   = false;
    this.productoImagenId  = null;
    this.imagenFile        = null;
    this.imagenPreview     = null;
    this.subiendoImagen    = false;
    this.cdr.detectChanges();
  }

  onImagenSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { this.toast.error('Formato inválido', 'Solo se permiten archivos de imagen.'); return; }
    if (file.size > 5 * 1024 * 1024)    { this.toast.error('Archivo muy grande', 'La imagen no puede superar 5 MB.'); return; }
    this.imagenFile = file;
    const reader = new FileReader();
    reader.onload = (e) => { this.imagenPreview = e.target?.result as string; this.cdr.detectChanges(); };
    reader.readAsDataURL(file);
  }

  subirImagen(): void {
    if (!this.imagenFile || !this.productoImagenId) return;
    this.subiendoImagen = true;
    this.productoService.subirImagen(this.productoImagenId, this.imagenFile).subscribe({
      next: () => this.cerrarImagenModal(),
      error: () => { this.subiendoImagen = false; this.cdr.detectChanges(); },
    });
  }

  async eliminarImagen(id: string): Promise<void> {
    const ok = await this.confirmService.confirm(
      'Eliminar imagen',
      '¿Deseas eliminar la imagen de este producto?',
      { labelAceptar: 'Eliminar', tipo: 'warning' },
    );
    if (!ok) return;
    this.productoService.eliminarImagen(id).subscribe();
  }

  formatCurrency(v: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v ?? 0);
  }

  // Historial de auditoría
  abrirHistorial(p: Producto): void {
    this.historialProducto = p;
    this.historial          = [];
    this.showHistorialModal = true;
    this.cargandoHistorial  = true;
    this.productoService.getHistorialStock(p.id).subscribe(data => {
      this.historial         = data;
      this.cargandoHistorial = false;
      this.cdr.detectChanges();
    });
  }

  cerrarHistorialModal(): void {
    this.showHistorialModal = false;
    this.historialProducto  = null;
    this.historial          = [];
  }

  tipoAccionLabel(tipo: string): string {
    const labels: Record<string, string> = {
      CREADO: 'Creado',
      STOCK_AUMENTADO: 'Stock aumentado',
      STOCK_DECREMENTADO: 'Stock disminuido',
      DESACTIVADO: 'Desactivado',
      REACTIVADO: 'Reactivado',
      UBICACION_CAMBIADA: 'Ubicación cambiada',
    };
    return labels[tipo] ?? tipo;
  }

  tipoAccionClase(tipo: string): string {
    const clases: Record<string, string> = {
      CREADO: 'bg-blue-50 text-blue-700',
      STOCK_AUMENTADO: 'bg-green-50 text-green-700',
      STOCK_DECREMENTADO: 'bg-yellow-50 text-yellow-700',
      DESACTIVADO: 'bg-red-50 text-red-700',
      REACTIVADO: 'bg-green-50 text-green-700',
      UBICACION_CAMBIADA: 'bg-purple-50 text-purple-700',
    };
    return clases[tipo] ?? 'bg-gray-100 text-gray-600';
  }

  // ── CATEGORÍAS ───────────────────────────────────────────────────────────

  initCategoriaForm(c?: Categoria): void {
    this.categoriaForm = this.fb.group({
      nombre:      [c?.nombre      ?? '', [Validators.required, Validators.maxLength(100)]],
      descripcion: [c?.descripcion ?? ''],
    });
  }

  openNewCategoria(): void {
    this.categoriaEditando = null;
    this.initCategoriaForm();
    this.showCategoriaModal = true;
  }

  openEditCategoria(c: Categoria): void {
    this.categoriaEditando = c;
    this.initCategoriaForm(c);
    this.showCategoriaModal = true;
  }

  closeCategoriaModal(): void {
    this.showCategoriaModal = false;
    this.categoriaEditando  = null;
  }

  onSubmitCategoria(): void {
    if (this.categoriaForm.invalid) return;
    const dto = {
      nombre:      this.categoriaForm.value.nombre,
      descripcion: this.categoriaForm.value.descripcion || undefined,
    };
    if (this.categoriaEditando) {
      this.productoService.updateCategoria(this.categoriaEditando.id, dto).subscribe();
    } else {
      this.productoService.createCategoria(dto).subscribe();
    }
    this.closeCategoriaModal();
  }

  countProductosByCategoria(categoriaId: string): number {
    return this.productos.filter(p => p.categoriaId === categoriaId).length;
  }

  async deleteCategoria(id: string): Promise<void> {
    const ok = await this.confirmService.confirm(
      'Eliminar categoría',
      'Los productos asociados quedarán sin categoría.',
      { labelAceptar: 'Eliminar', tipo: 'danger' },
    );
    if (!ok) return;
    this.productoService.deleteCategoria(id).subscribe();
  }
}
