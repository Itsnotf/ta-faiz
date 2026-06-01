<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        foreach (config('starterkit.roles') as $role) {
            Role::firstOrCreate(['name' => $role]);
        }

        // super_admin: semua permission
        Role::findByName('super_admin')
            ->syncPermissions(Permission::all());

        // admin_jurusan: semua kecuali institusi management, user/role management, dan permission khusus dosen/mahasiswa
        Role::findByName('admin_jurusan')
            ->syncPermissions(Permission::whereNotIn('name', [
                'institusi index', 'institusi edit',
                'users index', 'users create', 'users edit', 'users delete',
                'roles index', 'roles create', 'roles edit', 'roles delete',
                'keterangan create',
                'enrollment_dosen index', 'koreksi_dosen create',
            ])->get());

        // mahasiswa: hanya akses keterangan sendiri
        Role::findByName('mahasiswa')
            ->syncPermissions(Permission::whereIn('name', [
                'keterangan index', 'keterangan create',
            ])->get());

        // dosen: akses enrollment mandiri, lihat absensi diri sendiri, submit koreksi
        Role::findByName('dosen')
            ->syncPermissions(Permission::whereIn('name', [
                'enrollment_dosen index',
                'absensi_dosen index',
                'koreksi_dosen create',
            ])->get());
    }
}
