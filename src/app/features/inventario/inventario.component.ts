import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InventarioService } from './inventario.service';
import { ConfirmService } from '../../core/services/confirm.service';
import {
  Bodega, BodegaRequest,
  Pasillo, PasilloRequest,
  Estante, EstanteRequest,
  EstPasi, EstPasiRequest,
} from '../../shared/models/models';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './inventario.component.html',
})
export class InventarioComponent implements OnInit {
  bodegas:     Bodega[]  = [];
  pasillos:    Pasillo[] = [];
  estantes:    Estante[] = [];
  estPasiList: EstPasi[] = [];

  expandedBodegas  = new Set<number>();
  expandedPasillos = new Set<number>();

  showModal = false;
  modalTipo: 'bodega' | 'pasillo' | 'estante' | 'editEstPasi' | 'editPasillo' = 'bodega';

  bodegaForm!:      FormGroup;
  pasilloForm!:     FormGroup;
  estanteForm!:     FormGroup;
  editEstPasiForm!: FormGroup;
  editPasilloForm!: FormGroup;

  editingEstPasi:  EstPasi  | null = null;
  editingPasillo:  Pasillo  | null = null;

  constructor(
    private readonly inventarioService: InventarioService,
    private readonly confirmService: ConfirmService,
    private readonly fb: FormBuilder,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.inventarioService.getBodegas().subscribe();
    this.inventarioService.getPasillos().subscribe();
    this.inventarioService.getEstantes().subscribe();
    this.inventarioService.getEstPasi().subscribe();

    this.inventarioService.bodegas$.subscribe(b => {
      this.bodegas = b;
      b.forEach(bodega => { if (bodega.idBodega != null) this.expandedBodegas.add(bodega.idBodega); });
      this.cdr.detectChanges();
    });
    this.inventarioService.pasillos$.subscribe(p => {
      this.pasillos = p;
      p.forEach(pasillo => { if (pasillo.idPasillo != null) this.expandedPasillos.add(pasillo.idPasillo); });
      this.cdr.detectChanges();
    });
    this.inventarioService.estantes$.subscribe(e  => { this.estantes     = e;  this.cdr.detectChanges(); });
    this.inventarioService.estPasi$.subscribe(ep  => { this.estPasiList  = ep; this.cdr.detectChanges(); });
  }

  initForms(): void {
    this.bodegaForm = this.fb.group({
      nombre:         ['', Validators.required],
      direccion:      [''],
      ciudad:         [''],
      pais:           ['Chile'],
      capacidadTotal: [0, Validators.min(0)],
    });
    this.pasilloForm = this.fb.group({
      codigo:      ['', Validators.required],
      descripcion: [''],
      numeroOrden: [1, Validators.min(1)],
      idBodega:    [null, Validators.required],
    });
    this.estanteForm = this.fb.group({
      codigo:            ['', Validators.required],
      descripcion:       [''],
      numNiveles:        [1, [Validators.required, Validators.min(1)]],
      capacidadPorNivel: [0, Validators.min(0)],
      idPasillo:         [null, Validators.required],
    });
    this.editEstPasiForm = this.fb.group({
      posicion:      [''],
      ocupacionPct:  [0, [Validators.min(0), Validators.max(100)]],
      habilitada:    [true],
      observaciones: [''],
    });
    this.editPasilloForm = this.fb.group({
      descripcion: [''],
    });
  }

  openNewBodega(): void {
    this.modalTipo = 'bodega';
    this.bodegaForm.reset({ pais: 'Chile', capacidadTotal: 0 });
    this.showModal = true;
  }

  openNewPasillo(idBodega?: number): void {
    this.modalTipo = 'pasillo';
    this.pasilloForm.reset({ numeroOrden: 1, idBodega: idBodega ?? null });
    this.showModal = true;
  }

  openNewEstante(idPasillo?: number): void {
    this.modalTipo = 'estante';
    this.estanteForm.reset({ numNiveles: 1, capacidadPorNivel: 0, idPasillo: idPasillo ?? null });
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  onSubmitBodega(): void {
    if (this.bodegaForm.invalid) return;
    const dto: BodegaRequest = this.bodegaForm.value;
    this.inventarioService.createBodega(dto).subscribe();
    this.closeModal();
  }

  onSubmitPasillo(): void {
    if (this.pasilloForm.invalid) return;
    const dto: PasilloRequest = this.pasilloForm.value;
    this.inventarioService.createPasillo(dto).subscribe();
    this.closeModal();
  }

  onSubmitEstante(): void {
    if (this.estanteForm.invalid) return;
    const { idPasillo, ...rest } = this.estanteForm.value as { idPasillo: number } & EstanteRequest;
    this.inventarioService.createEstante(rest).subscribe({
      next: created => {
        if (idPasillo && created?.idEstante) {
          this.inventarioService.createEstPasiLink(created.idEstante, idPasillo).subscribe();
        }
        this.closeModal();
      },
      error: () => this.closeModal(),
    });
  }

  async deleteBodega(id: number): Promise<void> {
    const ok = await this.confirmService.confirm(
      'Eliminar bodega',
      'Esta acción eliminará la bodega permanentemente.',
      { labelAceptar: 'Eliminar', tipo: 'danger' },
    );
    if (ok) this.inventarioService.deleteBodega(id).subscribe();
  }

  async deletePasillo(id: number): Promise<void> {
    const ok = await this.confirmService.confirm(
      'Eliminar pasillo',
      'Esta acción eliminará el pasillo permanentemente.',
      { labelAceptar: 'Eliminar', tipo: 'danger' },
    );
    if (ok) this.inventarioService.deletePasillo(id).subscribe();
  }

  async deleteEstPasi(id: number): Promise<void> {
    const ok = await this.confirmService.confirm(
      'Quitar estante del pasillo',
      '¿Deseas quitar este estante del pasillo? El estante no será eliminado.',
      { labelAceptar: 'Quitar', tipo: 'warning' },
    );
    if (ok) this.inventarioService.deleteEstPasi(id).subscribe();
  }

  toggleBodega(b: Bodega): void {
    if (b.idBodega == null) return;
    this.inventarioService.toggleBodega(b.idBodega).subscribe();
  }

  toggleBodegaExpand(id: number): void {
    if (this.expandedBodegas.has(id)) {
      this.expandedBodegas.delete(id);
    } else {
      this.expandedBodegas.add(id);
    }
  }

  togglePasilloExpand(id: number): void {
    if (this.expandedPasillos.has(id)) {
      this.expandedPasillos.delete(id);
    } else {
      this.expandedPasillos.add(id);
    }
  }

  isBodegaExpanded(id: number):  boolean { return this.expandedBodegas.has(id); }
  isPasilloExpanded(id: number): boolean { return this.expandedPasillos.has(id); }

  getPasillosDeBodega(idBodega: number): Pasillo[] {
    return this.pasillos.filter(p => p.idBodega === idBodega);
  }

  getEstantesEnPasillo(idPasillo: number): EstPasi[] {
    return this.estPasiList.filter(ep => ep.idPasillo === idPasillo);
  }

  getOcupacionColor(pct?: number): string {
    if (pct == null) return 'text-gray-400';
    if (pct >= 80)   return 'text-red-600';
    if (pct >= 50)   return 'text-yellow-600';
    return 'text-green-600';
  }

  openEditEstPasi(ep: EstPasi): void {
    this.editingEstPasi = ep;
    this.modalTipo = 'editEstPasi';
    this.editEstPasiForm.reset({
      posicion:      ep.posicion ?? '',
      ocupacionPct:  ep.ocupacionPct ?? 0,
      habilitada:    ep.habilitada !== false,
      observaciones: ep.observaciones ?? '',
    });
    this.showModal = true;
  }

  onSubmitEditEstPasi(): void {
    if (!this.editingEstPasi?.idEstPasi) return;
    const ep = this.editingEstPasi;
    const v  = this.editEstPasiForm.value;
    const dto: EstPasiRequest = {
      idEstante:     ep.idEstante!,
      idPasillo:     ep.idPasillo!,
      posicion:      v.posicion || undefined,
      ocupacionPct:  Number(v.ocupacionPct),
      habilitada:    v.habilitada,
      observaciones: v.observaciones || undefined,
    };
    this.inventarioService.updateEstPasi(ep.idEstPasi!, dto).subscribe(() => this.closeModal());
  }

  openEditPasillo(p: Pasillo): void {
    this.editingPasillo = p;
    this.modalTipo = 'editPasillo';
    this.editPasilloForm.reset({ descripcion: p.descripcion ?? '' });
    this.showModal = true;
  }

  onSubmitEditPasillo(): void {
    if (!this.editingPasillo?.idPasillo) return;
    const p  = this.editingPasillo;
    const v  = this.editPasilloForm.value;
    const dto: PasilloRequest = {
      codigo:      p.codigo!,
      descripcion: v.descripcion,
      numeroOrden: p.numeroOrden ?? 1,
      idBodega:    p.idBodega!,
      activo:      p.activo !== false,
    };
    this.inventarioService.updatePasillo(p.idPasillo!, dto).subscribe(() => this.closeModal());
  }
}
