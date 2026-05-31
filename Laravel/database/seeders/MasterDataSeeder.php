<?php

namespace Database\Seeders;

use App\Models\Dosen;
use App\Models\Institusi;
use App\Models\Jadwal;
use App\Models\Jurusan;
use App\Models\Kelas;
use App\Models\Mahasiswa;
use App\Models\Prodi;
use App\Models\Ruangan;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MasterDataSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. INSTITUSI ──────────────────────────────────────────
        $institusi = Institusi::firstOrCreate(
            ['nama' => 'Politeknik Negeri Demo'],
            ['alamat' => 'Jl. Pendidikan No. 1, Kota Demo, Jawa Barat 40001', 'logo' => null]
        );

        // ── 2. JURUSAN ────────────────────────────────────────────
        $jurusanTI = Jurusan::firstOrCreate(
            ['kode' => 'TI'],
            ['institusi_id' => $institusi->id, 'nama' => 'Teknik Informatika']
        );
        $jurusanTE = Jurusan::firstOrCreate(
            ['kode' => 'TE'],
            ['institusi_id' => $institusi->id, 'nama' => 'Teknik Elektronika']
        );

        // ── Update admin demo → jurusan TI ───────────────────────
        User::where('email', 'admin@demo.id')->update(['jurusan_id' => $jurusanTI->id]);

        // ── 3. PRODI ──────────────────────────────────────────────
        $prodiD3TI  = Prodi::firstOrCreate(['kode' => 'D3-TI'],  ['jurusan_id' => $jurusanTI->id, 'nama' => 'D3 Teknik Informatika']);
        $prodiD4RPL = Prodi::firstOrCreate(['kode' => 'D4-RPL'], ['jurusan_id' => $jurusanTI->id, 'nama' => 'D4 Rekayasa Perangkat Lunak']);
        $prodiD3TE  = Prodi::firstOrCreate(['kode' => 'D3-TE'],  ['jurusan_id' => $jurusanTE->id, 'nama' => 'D3 Teknik Elektronika']);

        // ── 4. RUANGAN ────────────────────────────────────────────
        $ruanganLK1 = Ruangan::firstOrCreate(['kode' => 'LK1'], ['jurusan_id' => $jurusanTI->id, 'nama' => 'Lab Komputer 1', 'kapasitas' => 30]);
        $ruanganLK2 = Ruangan::firstOrCreate(['kode' => 'LK2'], ['jurusan_id' => $jurusanTI->id, 'nama' => 'Lab Komputer 2', 'kapasitas' => 30]);
        $ruanganGD1 = Ruangan::firstOrCreate(['kode' => 'GD1'], ['jurusan_id' => $jurusanTI->id, 'nama' => 'Gedung A Ruang 101', 'kapasitas' => 40]);
        $ruanganLE1 = Ruangan::firstOrCreate(['kode' => 'LE1'], ['jurusan_id' => $jurusanTE->id, 'nama' => 'Lab Elektronika 1', 'kapasitas' => 25]);

        // ── 5. KELAS ──────────────────────────────────────────────
        $kelas1ATI  = Kelas::firstOrCreate(['nama' => '1A', 'prodi_id' => $prodiD3TI->id],  ['angkatan' => 2024]);
        $kelas2ATI  = Kelas::firstOrCreate(['nama' => '2A', 'prodi_id' => $prodiD3TI->id],  ['angkatan' => 2023]);
        $kelas1BRPL = Kelas::firstOrCreate(['nama' => '1B', 'prodi_id' => $prodiD4RPL->id], ['angkatan' => 2024]);
        $kelas1ATE  = Kelas::firstOrCreate(['nama' => '1A', 'prodi_id' => $prodiD3TE->id],  ['angkatan' => 2024]);

        // ── 6. DOSEN (TI) ─────────────────────────────────────────
        $dosenData = [
            ['nip' => '197801012005011001', 'nama' => 'Dr. Budi Santoso, M.T.',        'email' => 'budi.santoso@poltek.demo'],
            ['nip' => '198202152008012002', 'nama' => 'Siti Rahayu, S.Kom., M.Cs.',    'email' => 'siti.rahayu@poltek.demo'],
            ['nip' => '197605202003011003', 'nama' => 'Agus Prasetyo, M.Kom.',          'email' => 'agus.prasetyo@poltek.demo'],
            ['nip' => '198509102010012004', 'nama' => 'Dewi Lestari, S.T., M.T.',       'email' => 'dewi.lestari@poltek.demo'],
            ['nip' => '197303081999031005', 'nama' => 'Hendra Wijaya, M.Sc.',           'email' => 'hendra.wijaya@poltek.demo'],
        ];
        $dosens = [];
        foreach ($dosenData as $d) {
            $dosens[] = Dosen::firstOrCreate(
                ['nip' => $d['nip']],
                ['jurusan_id' => $jurusanTI->id, 'nama' => $d['nama'], 'email' => $d['email']]
            );
        }

        // ── 7. MAHASISWA 1A TI (10 mhs) ──────────────────────────
        $mhsDemo = User::where('email', 'mahasiswa@demo.id')->first();

        $mahasiswa1ATI = [
            ['nim' => '2410001', 'nama' => 'Ahmad Fauzi',        'email_user' => 'mahasiswa@demo.id'],
            ['nim' => '2410002', 'nama' => 'Bunga Citra Lestari','email_user' => null],
            ['nim' => '2410003', 'nama' => 'Cahya Nugraha',      'email_user' => null],
            ['nim' => '2410004', 'nama' => 'Dina Permatasari',   'email_user' => null],
            ['nim' => '2410005', 'nama' => 'Eko Setiawan',       'email_user' => null],
            ['nim' => '2410006', 'nama' => 'Fitri Handayani',    'email_user' => null],
            ['nim' => '2410007', 'nama' => 'Galih Pratama',      'email_user' => null],
            ['nim' => '2410008', 'nama' => 'Hani Kusuma',        'email_user' => null],
            ['nim' => '2410009', 'nama' => 'Irfan Maulana',      'email_user' => null],
            ['nim' => '2410010', 'nama' => 'Juwita Sari',        'email_user' => null],
        ];

        foreach ($mahasiswa1ATI as $m) {
            if (Mahasiswa::where('nim', $m['nim'])->exists()) continue;

            if ($m['email_user'] === 'mahasiswa@demo.id' && $mhsDemo) {
                // Tautkan user demo yang sudah ada
                Mahasiswa::create([
                    'user_id'    => $mhsDemo->id,
                    'kelas_id'   => $kelas1ATI->id,
                    'nim'        => $m['nim'],
                    'nama'       => $m['nama'],
                    'status_akun'=> 'pending_upload',
                ]);
            } else {
                DB::transaction(function () use ($m, $kelas1ATI) {
                    $user = User::firstOrCreate(
                        ['email' => $m['nim'] . '@mhs.demo.id'],
                        ['name' => $m['nama'], 'password' => 'Password@123', 'email_verified_at' => now()]
                    );
                    $user->assignRole('mahasiswa');
                    Mahasiswa::create([
                        'user_id'    => $user->id,
                        'kelas_id'   => $kelas1ATI->id,
                        'nim'        => $m['nim'],
                        'nama'       => $m['nama'],
                        'status_akun'=> 'pending_upload',
                    ]);
                });
            }
        }

        // ── 8. MAHASISWA 2A TI (8 mhs) ───────────────────────────
        $mahasiswa2ATI = [
            ['nim' => '2310001', 'nama' => 'Aldi Kurniawan'],
            ['nim' => '2310002', 'nama' => 'Bella Safitri'],
            ['nim' => '2310003', 'nama' => 'Chandra Putra'],
            ['nim' => '2310004', 'nama' => 'Devi Anggraini'],
            ['nim' => '2310005', 'nama' => 'Evan Perdana'],
            ['nim' => '2310006', 'nama' => 'Fanny Oktavia'],
            ['nim' => '2310007', 'nama' => 'Gilang Ramadhan'],
            ['nim' => '2310008', 'nama' => 'Hesti Wulandari'],
        ];

        foreach ($mahasiswa2ATI as $m) {
            if (Mahasiswa::where('nim', $m['nim'])->exists()) continue;
            DB::transaction(function () use ($m, $kelas2ATI) {
                $user = User::firstOrCreate(
                    ['email' => $m['nim'] . '@mhs.demo.id'],
                    ['name' => $m['nama'], 'password' => 'Password@123', 'email_verified_at' => now()]
                );
                $user->assignRole('mahasiswa');
                Mahasiswa::create([
                    'user_id'    => $user->id,
                    'kelas_id'   => $kelas2ATI->id,
                    'nim'        => $m['nim'],
                    'nama'       => $m['nama'],
                    'status_akun'=> 'pending_upload',
                ]);
            });
        }

        // ── 9. MAHASISWA 1B RPL (6 mhs) ──────────────────────────
        $mahasiswa1BRPL = [
            ['nim' => '2420001', 'nama' => 'Anisa Putri'],
            ['nim' => '2420002', 'nama' => 'Bagas Wicaksono'],
            ['nim' => '2420003', 'nama' => 'Cika Amelia'],
            ['nim' => '2420004', 'nama' => 'Dimas Arfan'],
            ['nim' => '2420005', 'nama' => 'Elsa Maharani'],
            ['nim' => '2420006', 'nama' => 'Fajar Nugroho'],
        ];

        foreach ($mahasiswa1BRPL as $m) {
            if (Mahasiswa::where('nim', $m['nim'])->exists()) continue;
            DB::transaction(function () use ($m, $kelas1BRPL) {
                $user = User::firstOrCreate(
                    ['email' => $m['nim'] . '@mhs.demo.id'],
                    ['name' => $m['nama'], 'password' => 'Password@123', 'email_verified_at' => now()]
                );
                $user->assignRole('mahasiswa');
                Mahasiswa::create([
                    'user_id'    => $user->id,
                    'kelas_id'   => $kelas1BRPL->id,
                    'nim'        => $m['nim'],
                    'nama'       => $m['nama'],
                    'status_akun'=> 'pending_upload',
                ]);
            });
        }

        // ── 10. JADWAL ────────────────────────────────────────────
        $jadwalData = [
            // 1A TI
            ['kelas' => $kelas1ATI, 'dosen' => $dosens[0], 'ruangan' => $ruanganLK1, 'matkul' => 'Pemrograman Web',      'hari' => 'senin',  'mulai' => '08:00', 'selesai' => '10:30', 'window' => 15],
            ['kelas' => $kelas1ATI, 'dosen' => $dosens[1], 'ruangan' => $ruanganGD1, 'matkul' => 'Basis Data',           'hari' => 'selasa', 'mulai' => '10:00', 'selesai' => '12:30', 'window' => 15],
            ['kelas' => $kelas1ATI, 'dosen' => $dosens[2], 'ruangan' => $ruanganLK2, 'matkul' => 'Jaringan Komputer',   'hari' => 'rabu',   'mulai' => '07:30', 'selesai' => '10:00', 'window' => 15],
            ['kelas' => $kelas1ATI, 'dosen' => $dosens[3], 'ruangan' => $ruanganGD1, 'matkul' => 'Sistem Operasi',      'hari' => 'kamis',  'mulai' => '13:00', 'selesai' => '15:30', 'window' => 15],
            // 2A TI
            ['kelas' => $kelas2ATI, 'dosen' => $dosens[0], 'ruangan' => $ruanganLK1, 'matkul' => 'Pemrograman Mobile',  'hari' => 'senin',  'mulai' => '13:00', 'selesai' => '15:30', 'window' => 15],
            ['kelas' => $kelas2ATI, 'dosen' => $dosens[4], 'ruangan' => $ruanganLK2, 'matkul' => 'Kecerdasan Buatan',   'hari' => 'rabu',   'mulai' => '10:00', 'selesai' => '12:30', 'window' => 15],
            ['kelas' => $kelas2ATI, 'dosen' => $dosens[2], 'ruangan' => $ruanganGD1, 'matkul' => 'Keamanan Sistem',     'hari' => 'jumat',  'mulai' => '08:00', 'selesai' => '10:30', 'window' => 15],
            // 1B RPL
            ['kelas' => $kelas1BRPL, 'dosen' => $dosens[1], 'ruangan' => $ruanganLK2, 'matkul' => 'Rekayasa Perangkat Lunak', 'hari' => 'selasa', 'mulai' => '13:00', 'selesai' => '15:30', 'window' => 15],
            ['kelas' => $kelas1BRPL, 'dosen' => $dosens[3], 'ruangan' => $ruanganGD1, 'matkul' => 'Manajemen Proyek IT',      'hari' => 'kamis',  'mulai' => '08:00', 'selesai' => '10:30', 'window' => 15],
        ];

        foreach ($jadwalData as $j) {
            Jadwal::firstOrCreate(
                [
                    'kelas_id'   => $j['kelas']->id,
                    'dosen_id'   => $j['dosen']->id,
                    'mata_kuliah'=> $j['matkul'],
                ],
                [
                    'ruangan_id' => $j['ruangan']->id,
                    'hari'       => $j['hari'],
                    'jam_mulai'  => $j['mulai'],
                    'jam_selesai'=> $j['selesai'],
                    'window_menit' => $j['window'],
                    'is_active'  => true,
                ]
            );
        }

        $this->command->info('✅ Master data berhasil di-seed:');
        $this->command->info('   1 Institusi | 2 Jurusan | 3 Prodi | 4 Ruangan | 4 Kelas');
        $this->command->info('   5 Dosen | ' . Mahasiswa::count() . ' Mahasiswa | ' . Jadwal::count() . ' Jadwal');
    }
}
