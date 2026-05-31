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
    }
}
