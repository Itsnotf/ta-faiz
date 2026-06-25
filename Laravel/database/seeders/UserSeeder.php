<?php

namespace Database\Seeders;

use App\Models\AdminJurusan;
use App\Models\Institusi;
use App\Models\Jurusan;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. Super Admin ─────────────────────────────────────────────────
        $superAdmin = User::firstOrCreate(
            ['email' => 'superadmin@demo.id'],
            [
                'name'              => 'Super Admin',
                'password'          => 'password',
                'email_verified_at' => now(),
            ]
        );
        $superAdmin->syncRoles('super_admin');

        // ── 2. Institusi & Jurusan dummy (dibutuhkan UserSeeder) ───────────
        $institusi = Institusi::firstOrCreate(
            ['nama' => 'Politeknik Negeri Demo'],
            ['alamat' => 'Jl. Pendidikan No. 1, Palembang']
        );

        $jurusanTI = Jurusan::firstOrCreate(
            ['kode' => 'TI'],
            ['institusi_id' => $institusi->id, 'nama' => 'Teknik Informatika']
        );

        $jurusanTE = Jurusan::firstOrCreate(
            ['kode' => 'TE'],
            ['institusi_id' => $institusi->id, 'nama' => 'Teknik Elektronika']
        );

        // ── 3. Admin Jurusan TI ────────────────────────────────────────────
        $adminTIUser = User::firstOrCreate(
            ['email' => 'admin.ti@demo.id'],
            [
                'name'              => 'Admin Jurusan TI',
                'password'          => 'password',
                'email_verified_at' => now(),
            ]
        );
        $adminTIUser->syncRoles('admin_jurusan');

        AdminJurusan::firstOrCreate(
            ['user_id' => $adminTIUser->id],
            [
                'jurusan_id' => $jurusanTI->id,
                'nama'       => 'Admin Jurusan TI',
                'email'      => 'admin.ti@demo.id',
                'no_hp'      => '081234567890',
            ]
        );

        // ── 4. Admin Jurusan TE ────────────────────────────────────────────
        $adminTEUser = User::firstOrCreate(
            ['email' => 'admin.te@demo.id'],
            [
                'name'              => 'Admin Jurusan TE',
                'password'          => 'password',
                'email_verified_at' => now(),
            ]
        );
        $adminTEUser->syncRoles('admin_jurusan');

        AdminJurusan::firstOrCreate(
            ['user_id' => $adminTEUser->id],
            [
                'jurusan_id' => $jurusanTE->id,
                'nama'       => 'Admin Jurusan TE',
                'email'      => 'admin.te@demo.id',
                'no_hp'      => '081234567891',
            ]
        );

        $this->command->info('✅ UserSeeder selesai:');
        $this->command->info('   superadmin@demo.id / password  → Super Admin');
        $this->command->info('   admin.ti@demo.id / password   → Admin Jurusan TI');
        $this->command->info('   admin.te@demo.id / password   → Admin Jurusan TE');
    }
}
