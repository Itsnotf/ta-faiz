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

        // admin_jurusan: semua KECUALI yang di-exclude
        Role::findByName('admin_jurusan')
            ->syncPermissions(Permission::whereNotIn('name', [
                // Institusi — hanya super admin
                'institusi index', 'institusi edit',
                // Jurusan — hanya super admin (admin jurusan sudah tahu jurusannya)
                'jurusan index', 'jurusan create', 'jurusan edit', 'jurusan delete',
                // User & Role management — hanya super admin
                'users index', 'users create', 'users edit', 'users delete',
                'roles index', 'roles create', 'roles edit', 'roles delete',
                // Keterangan create — hanya mahasiswa
                'keterangan create',
                // Fitur khusus dosen
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
