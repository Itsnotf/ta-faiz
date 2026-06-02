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
use Illuminate\Support\Facades\Hash;

class MasterDataSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. INSTITUSI ──────────────────────────────────────────────────
        $institusi = Institusi::firstOrCreate(
            ['nama' => 'Politeknik Negeri Demo'],
            ['alamat' => 'Jl. Pendidikan No. 1, Palembang']
        );

        // ── 2. JURUSAN ────────────────────────────────────────────────────
        $jurusanTI = Jurusan::firstOrCreate(
            ['kode' => 'TI'],
            ['institusi_id' => $institusi->id, 'nama' => 'Teknik Informatika']
        );
        $jurusanTE = Jurusan::firstOrCreate(
            ['kode' => 'TE'],
            ['institusi_id' => $institusi->id, 'nama' => 'Teknik Elektronika']
        );

        // ── 3. PRODI ──────────────────────────────────────────────────────
        $prodiD3TI  = Prodi::firstOrCreate(['kode' => 'D3-TI'],  ['jurusan_id' => $jurusanTI->id, 'nama' => 'D3 Teknik Informatika']);
        $prodiD4RPL = Prodi::firstOrCreate(['kode' => 'D4-RPL'], ['jurusan_id' => $jurusanTI->id, 'nama' => 'D4 Rekayasa Perangkat Lunak']);
        $prodiD3TE  = Prodi::firstOrCreate(['kode' => 'D3-TE'],  ['jurusan_id' => $jurusanTE->id, 'nama' => 'D3 Teknik Elektronika']);

        // ── 4. RUANGAN ────────────────────────────────────────────────────
        $ruanganLK1 = Ruangan::firstOrCreate(['kode' => 'LK1'], ['jurusan_id' => $jurusanTI->id, 'nama' => 'Lab Komputer 1',    'kapasitas' => 30]);
        $ruanganLK2 = Ruangan::firstOrCreate(['kode' => 'LK2'], ['jurusan_id' => $jurusanTI->id, 'nama' => 'Lab Komputer 2',    'kapasitas' => 30]);
        $ruanganGD1 = Ruangan::firstOrCreate(['kode' => 'GD1'], ['jurusan_id' => $jurusanTI->id, 'nama' => 'Gedung A Ruang 101','kapasitas' => 40]);
        $ruanganLE1 = Ruangan::firstOrCreate(['kode' => 'LE1'], ['jurusan_id' => $jurusanTE->id, 'nama' => 'Lab Elektronika 1', 'kapasitas' => 25]);

        // ── 5. KELAS ──────────────────────────────────────────────────────
        $kelas1ATI  = Kelas::firstOrCreate(['nama' => '1A', 'prodi_id' => $prodiD3TI->id],  ['angkatan' => 2024]);
        $kelas2ATI  = Kelas::firstOrCreate(['nama' => '2A', 'prodi_id' => $prodiD3TI->id],  ['angkatan' => 2023]);
        $kelas1BRPL = Kelas::firstOrCreate(['nama' => '1B', 'prodi_id' => $prodiD4RPL->id], ['angkatan' => 2024]);
        $kelas1ATE  = Kelas::firstOrCreate(['nama' => '1A', 'prodi_id' => $prodiD3TE->id],  ['angkatan' => 2024]);

        // ── 6. DOSEN TI ───────────────────────────────────────────────────
        $dosenTIData = [
            ['nip' => '197801012005011001', 'nama' => 'Dr. Budi Santoso, M.T.',      'email' => 'budi.santoso@demo.id'],
            ['nip' => '198202152008012002', 'nama' => 'Siti Rahayu, S.Kom., M.Cs.', 'email' => 'siti.rahayu@demo.id'],
            ['nip' => '197605202003011003', 'nama' => 'Agus Prasetyo, M.Kom.',       'email' => 'agus.prasetyo@demo.id'],
            ['nip' => '198509102010012004', 'nama' => 'Dewi Lestari, S.T., M.T.',   'email' => 'dewi.lestari@demo.id'],
            ['nip' => '197303081999031005', 'nama' => 'Hendra Wijaya, M.Sc.',        'email' => 'hendra.wijaya@demo.id'],
        ];

        $dosensTI = [];
        foreach ($dosenTIData as $d) {
            $existingDosen = Dosen::where('nip', $d['nip'])->first();
            if ($existingDosen && $existingDosen->user_id) {
                $dosensTI[] = $existingDosen;
                continue;
            }

            DB::transaction(function () use ($d, $jurusanTI, &$dosensTI) {
                $user = User::firstOrCreate(
                    ['email' => $d['email']],
                    [
                        'name'              => $d['nama'],
                        'password'          => Hash::make('Password@123'),
                        'email_verified_at' => now(),
                    ]
                );
                $user->syncRoles('dosen');

                $dosen = Dosen::firstOrCreate(
                    ['nip' => $d['nip']],
                    [
                        'user_id'    => $user->id,
                        'jurusan_id' => $jurusanTI->id,
                        'nama'       => $d['nama'],
                        'email'      => $d['email'],
                    ]
                );

                if (!$dosen->user_id) {
                    $dosen->update(['user_id' => $user->id]);
                }

                $dosensTI[] = $dosen;
            });
        }

        // ── 7. DOSEN TE ───────────────────────────────────────────────────
        $dosenTEData = [
            ['nip' => '197201012001011001', 'nama' => 'Prof. Ahmad Fauzan, M.T.', 'email' => 'ahmad.fauzan@demo.id'],
            ['nip' => '198005102006012002', 'nama' => 'Rina Susanti, M.Eng.',     'email' => 'rina.susanti@demo.id'],
        ];

        $dosenTE = [];
        foreach ($dosenTEData as $d) {
            $existingDosen = Dosen::where('nip', $d['nip'])->first();
            if ($existingDosen && $existingDosen->user_id) {
                $dosenTE[] = $existingDosen;
                continue;
            }

            DB::transaction(function () use ($d, $jurusanTE, &$dosenTE) {
                $user = User::firstOrCreate(
                    ['email' => $d['email']],
                    [
                        'name'              => $d['nama'],
                        'password'          => Hash::make('Password@123'),
                        'email_verified_at' => now(),
                    ]
                );
                $user->syncRoles('dosen');

                $dosen = Dosen::firstOrCreate(
                    ['nip' => $d['nip']],
                    [
                        'user_id'    => $user->id,
                        'jurusan_id' => $jurusanTE->id,
                        'nama'       => $d['nama'],
                        'email'      => $d['email'],
                    ]
                );

                if (!$dosen->user_id) {
                    $dosen->update(['user_id' => $user->id]);
                }

                $dosenTE[] = $dosen;
            });
        }

        // ── 8. MAHASISWA 1A TI (10 mhs) ──────────────────────────────────
        $this->seedMahasiswa($kelas1ATI->id, [
            ['nim' => '2410001', 'nama' => 'Ahmad Fauzi',         'email' => 'ahmad.fauzi@mhs.demo.id'],
            ['nim' => '2410002', 'nama' => 'Bunga Citra Lestari', 'email' => 'bunga.citra@mhs.demo.id'],
            ['nim' => '2410003', 'nama' => 'Cahya Nugraha',       'email' => 'cahya.nugraha@mhs.demo.id'],
            ['nim' => '2410004', 'nama' => 'Dina Permatasari',    'email' => 'dina.permatasari@mhs.demo.id'],
            ['nim' => '2410005', 'nama' => 'Eko Setiawan',        'email' => 'eko.setiawan@mhs.demo.id'],
            ['nim' => '2410006', 'nama' => 'Fitri Handayani',     'email' => 'fitri.handayani@mhs.demo.id'],
            ['nim' => '2410007', 'nama' => 'Galih Pratama',       'email' => 'galih.pratama@mhs.demo.id'],
            ['nim' => '2410008', 'nama' => 'Hani Kusuma',         'email' => 'hani.kusuma@mhs.demo.id'],
            ['nim' => '2410009', 'nama' => 'Irfan Maulana',       'email' => 'irfan.maulana@mhs.demo.id'],
            ['nim' => '2410010', 'nama' => 'Juwita Sari',         'email' => 'juwita.sari@mhs.demo.id'],
        ], demoEmail: 'mahasiswa@demo.id', demoNim: '2410001');

        // ── 9. MAHASISWA 2A TI (8 mhs) ───────────────────────────────────
        $this->seedMahasiswa($kelas2ATI->id, [
            ['nim' => '2310001', 'nama' => 'Aldi Kurniawan',   'email' => 'aldi.kurniawan@mhs.demo.id'],
            ['nim' => '2310002', 'nama' => 'Bella Safitri',    'email' => 'bella.safitri@mhs.demo.id'],
            ['nim' => '2310003', 'nama' => 'Chandra Putra',    'email' => 'chandra.putra@mhs.demo.id'],
            ['nim' => '2310004', 'nama' => 'Devi Anggraini',   'email' => 'devi.anggraini@mhs.demo.id'],
            ['nim' => '2310005', 'nama' => 'Evan Perdana',     'email' => 'evan.perdana@mhs.demo.id'],
            ['nim' => '2310006', 'nama' => 'Fanny Oktavia',    'email' => 'fanny.oktavia@mhs.demo.id'],
            ['nim' => '2310007', 'nama' => 'Gilang Ramadhan',  'email' => 'gilang.ramadhan@mhs.demo.id'],
            ['nim' => '2310008', 'nama' => 'Hesti Wulandari',  'email' => 'hesti.wulandari@mhs.demo.id'],
        ]);

        // ── 10. MAHASISWA 1B RPL (6 mhs) ─────────────────────────────────
        $this->seedMahasiswa($kelas1BRPL->id, [
            ['nim' => '2420001', 'nama' => 'Anisa Putri',      'email' => 'anisa.putri@mhs.demo.id'],
            ['nim' => '2420002', 'nama' => 'Bagas Wicaksono',  'email' => 'bagas.wicaksono@mhs.demo.id'],
            ['nim' => '2420003', 'nama' => 'Cika Amelia',      'email' => 'cika.amelia@mhs.demo.id'],
            ['nim' => '2420004', 'nama' => 'Dimas Arfan',      'email' => 'dimas.arfan@mhs.demo.id'],
            ['nim' => '2420005', 'nama' => 'Elsa Maharani',    'email' => 'elsa.maharani@mhs.demo.id'],
            ['nim' => '2420006', 'nama' => 'Fajar Nugroho',    'email' => 'fajar.nugroho@mhs.demo.id'],
        ]);

        // ── 11. MAHASISWA 1A TE (5 mhs) ──────────────────────────────────
        $this->seedMahasiswa($kelas1ATE->id, [
            ['nim' => '2430001', 'nama' => 'Gita Safira',      'email' => 'gita.safira@mhs.demo.id'],
            ['nim' => '2430002', 'nama' => 'Hanif Pratama',    'email' => 'hanif.pratama@mhs.demo.id'],
            ['nim' => '2430003', 'nama' => 'Indira Sari',      'email' => 'indira.sari@mhs.demo.id'],
            ['nim' => '2430004', 'nama' => 'Jaka Santoso',     'email' => 'jaka.santoso@mhs.demo.id'],
            ['nim' => '2430005', 'nama' => 'Kirana Dewi',      'email' => 'kirana.dewi@mhs.demo.id'],
        ]);

        // ── 12. JADWAL TI ─────────────────────────────────────────────────
        $jadwalTI = [
            // 1A TI
            [$kelas1ATI, $dosensTI[0], $ruanganLK1, 'Pemrograman Web',     'senin',  '08:00', '10:30', 15, 30],
            [$kelas1ATI, $dosensTI[1], $ruanganGD1, 'Basis Data',          'selasa', '10:00', '12:30', 15, 30],
            [$kelas1ATI, $dosensTI[2], $ruanganLK2, 'Jaringan Komputer',   'rabu',   '07:30', '10:00', 15, 30],
            [$kelas1ATI, $dosensTI[3], $ruanganGD1, 'Sistem Operasi',      'kamis',  '13:00', '15:30', 15, 30],
            // 2A TI
            [$kelas2ATI, $dosensTI[0], $ruanganLK1, 'Pemrograman Mobile',  'senin',  '13:00', '15:30', 15, 30],
            [$kelas2ATI, $dosensTI[4], $ruanganLK2, 'Kecerdasan Buatan',   'rabu',   '10:00', '12:30', 15, 30],
            [$kelas2ATI, $dosensTI[2], $ruanganGD1, 'Keamanan Sistem',     'jumat',  '08:00', '10:30', 15, 30],
            // 1B RPL
            [$kelas1BRPL, $dosensTI[1], $ruanganLK2, 'Rekayasa Perangkat Lunak', 'selasa', '13:00', '15:30', 15, 30],
            [$kelas1BRPL, $dosensTI[3], $ruanganGD1, 'Manajemen Proyek IT',      'kamis',  '08:00', '10:30', 15, 30],
        ];

        foreach ($jadwalTI as [$kelas, $dosen, $ruangan, $matkul, $hari, $mulai, $selesai, $wMhs, $wDosen]) {
            Jadwal::firstOrCreate(
                ['kelas_id' => $kelas->id, 'dosen_id' => $dosen->id, 'mata_kuliah' => $matkul],
                [
                    'ruangan_id'         => $ruangan->id,
                    'hari'               => $hari,
                    'jam_mulai'          => $mulai,
                    'jam_selesai'        => $selesai,
                    'window_menit'       => $wMhs,
                    'window_dosen_menit' => $wDosen,
                    'is_active'          => true,
                ]
            );
        }

        // ── 13. JADWAL TE ─────────────────────────────────────────────────
        $jadwalTE = [
            [$kelas1ATE, $dosenTE[0], $ruanganLE1, 'Teknik Digital',       'senin',  '08:00', '10:30', 15, 30],
            [$kelas1ATE, $dosenTE[1], $ruanganLE1, 'Elektronika Analog',   'rabu',   '10:00', '12:30', 15, 30],
        ];

        foreach ($jadwalTE as [$kelas, $dosen, $ruangan, $matkul, $hari, $mulai, $selesai, $wMhs, $wDosen]) {
            Jadwal::firstOrCreate(
                ['kelas_id' => $kelas->id, 'dosen_id' => $dosen->id, 'mata_kuliah' => $matkul],
                [
                    'ruangan_id'         => $ruangan->id,
                    'hari'               => $hari,
                    'jam_mulai'          => $mulai,
                    'jam_selesai'        => $selesai,
                    'window_menit'       => $wMhs,
                    'window_dosen_menit' => $wDosen,
                    'is_active'          => true,
                ]
            );
        }

        $this->command->info('✅ Master data berhasil di-seed:');
        $this->command->info('   Jurusan TI: ' . Mahasiswa::whereHas('kelas.prodi', fn($q) => $q->where('jurusan_id', $jurusanTI->id))->count() . ' mahasiswa, ' . Dosen::where('jurusan_id', $jurusanTI->id)->count() . ' dosen');
        $this->command->info('   Jurusan TE: ' . Mahasiswa::whereHas('kelas.prodi', fn($q) => $q->where('jurusan_id', $jurusanTE->id))->count() . ' mahasiswa, ' . Dosen::where('jurusan_id', $jurusanTE->id)->count() . ' dosen');
        $this->command->info('   Total jadwal: ' . Jadwal::count());
        $this->command->info('');
        $this->command->info('   Login accounts:');
        $this->command->info('   superadmin@demo.id   → Super Admin');
        $this->command->info('   admin.ti@demo.id     → Admin Jurusan TI (hanya lihat data TI)');
        $this->command->info('   admin.te@demo.id     → Admin Jurusan TE (hanya lihat data TE)');
        $this->command->info('   mahasiswa@demo.id    → Mahasiswa (Ahmad Fauzi, 1A TI)');
        $this->command->info('   budi.santoso@demo.id → Dosen TI (Dr. Budi Santoso)');
        $this->command->info('   Semua password: Password@123');
    }

    private function seedMahasiswa(
        int $kelasId,
        array $list,
        ?string $demoEmail = null,
        ?string $demoNim   = null
    ): void {
        foreach ($list as $m) {
            if (Mahasiswa::where('nim', $m['nim'])->exists()) continue;

            $emailToUse = ($demoNim && $m['nim'] === $demoNim && $demoEmail)
                ? $demoEmail
                : $m['email'];

            DB::transaction(function () use ($m, $kelasId, $emailToUse) {
                $user = User::firstOrCreate(
                    ['email' => $emailToUse],
                    [
                        'name'              => $m['nama'],
                        'password'          => Hash::make('Password@123'),
                        'email_verified_at' => now(),
                    ]
                );
                $user->syncRoles('mahasiswa');

                Mahasiswa::create([
                    'user_id'     => $user->id,
                    'kelas_id'    => $kelasId,
                    'nim'         => $m['nim'],
                    'nama'        => $m['nama'],
                    'email'       => $emailToUse,
                    'status_akun' => 'pending_upload',
                ]);
            });
        }
    }
}
