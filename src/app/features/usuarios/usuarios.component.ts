import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsuarioService, RolService } from './usuario.service';
import { Usuario, Rol } from '../../shared/models/models';
import { ConfirmService } from '../../core/services/confirm.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './usuarios.component.html',
})
export class UsuariosComponent implements OnInit {
  usuarios: Usuario[] = [];
  roles: Rol[] = [];
  showModal = false;
  editando: Usuario | null = null;
  form!: FormGroup;

  get activos(): number   { return this.usuarios.filter(u => u.activo).length; }
  get inactivos(): number { return this.usuarios.filter(u => !u.activo).length; }

  constructor(
    private usuarioService: UsuarioService,
    private rolService: RolService,
    private readonly confirmService: ConfirmService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.usuarioService.getAll().subscribe();
    this.rolService.getAll().subscribe();
    this.usuarioService.usuarios$.subscribe(u => { this.usuarios = u; this.cdr.detectChanges(); });
    this.rolService.roles$.subscribe(r => { this.roles = r.filter(r => r.nombre !== 'admin'); this.cdr.detectChanges(); });
  }

  initForm(u?: Usuario): void {
    this.form = this.fb.group({
      rolNombre: [u?.rolNombre ?? this.sugerirRol(u?.correo ?? ''), Validators.required],
    });
  }

  sugerirRol(correo: string): string {
    const c = correo.toLowerCase();
    if (c.includes('smartlogixb') || c.includes('bodeguero')) return 'bodeguero';
    if (c.includes('smartlogixt') || c.includes('transportista')) return 'transportista';
    return 'cliente';
  }

  openEdit(u: Usuario): void {
    this.editando = u;
    this.initForm(u);
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; this.editando = null; }

  onSubmit(): void {
    if (this.form.invalid || !this.editando) return;
    const rolNombre = this.form.value.rolNombre as string;
    const rol = this.roles.find(r => r.nombre === rolNombre);
    if (!rol) return;
    this.usuarioService.asignarRol(this.editando.id, rol.id, rol.nombre).subscribe();
    this.closeModal();
  }

  async onDelete(id: string): Promise<void> {
    const ok = await this.confirmService.confirm(
      'Eliminar usuario',
      'Esta acción eliminará el usuario permanentemente.',
      { labelAceptar: 'Eliminar', tipo: 'danger' },
    );
    if (!ok) return;
    this.usuarioService.delete(id).subscribe();
  }

  toggleActivo(u: Usuario): void {
    this.usuarioService.toggleActivo(u.id).subscribe();
  }

  getInitials(nombre: string): string { return this.usuarioService.getInitials(nombre); }

  getAvatarColor(nombre: string): string {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-600', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
    return colors[nombre.charCodeAt(0) % colors.length];
  }

  getRolBadge(rolNombre?: string): string {
    const map: Record<string, string> = {
      admin:         'bg-red-100 text-red-800',
      bodeguero:     'bg-blue-100 text-blue-800',
      transportista: 'bg-yellow-100 text-yellow-800',
      cliente:       'bg-green-100 text-green-800',
    };
    return map[rolNombre ?? ''] ?? 'bg-gray-100 text-gray-600';
  }
}
