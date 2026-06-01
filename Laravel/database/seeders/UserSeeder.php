<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $superAdmin = User::firstOrCreate(
            ['email' => 'superadmin@demo.id'],
            [
                'name' => 'Super Admin',
                'password' => 'Password@123',
                'email_verified_at' => now(),
            ]
        );
        $superAdmin->assignRole('super_admin');

        $adminJurusan = User::firstOrCreate(
            ['email' => 'admin@demo.id'],
            [
                'name' => 'Admin Jurusan',
                'password' => 'Password@123',
                'email_verified_at' => now(),
            ]
        );
        $adminJurusan->assignRole('admin_jurusan');

        $mahasiswa = User::firstOrCreate(
            ['email' => 'mahasiswa@demo.id'],
            [
                'name' => 'Mahasiswa Demo',
                'password' => 'Password@123',
                'email_verified_at' => now(),
            ]
        );
        $mahasiswa->assignRole('mahasiswa');

        $dosenUser = User::firstOrCreate(
            ['email' => 'dosen@demo.id'],
            [
                'name'              => 'Dr. Budi Santoso',
                'password'          => 'Password@123',
                'email_verified_at' => now(),
            ]
        );
        $dosenUser->assignRole('dosen');

        // Ambil atau buat jurusan demo jika belum ada
        $jurusan = \App\Models\Jurusan::first();
        if (!$jurusan) {
            $institusi = \App\Models\Institusi::firstOrCreate(
                ['nama' => 'Politeknik Demo'],
                ['kode' => 'POLI-DEMO', 'alamat' => '-']
            );
            $jurusan = \App\Models\Jurusan::firstOrCreate(
                ['kode' => 'TI-DEMO'],
                ['institusi_id' => $institusi->id, 'nama' => 'Teknik Informatika']
            );
        }

        $dosenRecord = \App\Models\Dosen::firstOrCreate(
            ['nip' => '198001012010011001'],
            [
                'user_id'    => $dosenUser->id,
                'jurusan_id' => $jurusan->id,
                'nama'       => 'Dr. Budi Santoso',
                'email'      => 'dosen@demo.id',
            ]
        );

        // Pastikan user_id ter-link jika record sudah ada tapi user_id masih null
        if (!$dosenRecord->user_id) {
            $dosenRecord->update(['user_id' => $dosenUser->id]);
        }
    }
}
