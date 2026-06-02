<?php

namespace App\Services;

use App\Models\Kelas;
use App\Models\Mahasiswa;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class MahasiswaService
{
    public function index(?string $search, ?string $kelasId, ?int $jurusanId, bool $isSuperAdmin): LengthAwarePaginator
    {
        return Mahasiswa::query()
            ->with('kelas.prodi.jurusan')
            ->when(!$isSuperAdmin && $jurusanId, fn($q) =>
                $q->whereHas('kelas.prodi', fn($q2) => $q2->where('jurusan_id', $jurusanId))
            )
            ->when($search, fn($q) => $q->where(fn($q2) =>
                $q2->where('nama', 'like', "%{$search}%")->orWhere('nim', 'like', "%{$search}%")
            ))
            ->when($kelasId, fn($q) => $q->where('kelas_id', $kelasId))
            ->latest()
            ->paginate(config('starterkit.pagination'))
            ->withQueryString();
    }

    public function getKelasOptions(?int $jurusanId, bool $isSuperAdmin): Collection
    {
        return Kelas::query()
            ->with('prodi')
            ->when(!$isSuperAdmin && $jurusanId, fn($q) => $q->whereHas('prodi', fn($q2) => $q2->where('jurusan_id', $jurusanId)))
            ->orderBy('nama')
            ->get(['id', 'nama', 'prodi_id']);
    }

    public function store(array $data): Mahasiswa
    {
        return DB::transaction(function () use ($data) {
            $user = User::create([
                'name'              => $data['nama'],
                'email'             => $data['email'],
                'password'          => Hash::make('Password@123'),
                'email_verified_at' => now(),
            ]);
            $user->syncRoles('mahasiswa');

            return Mahasiswa::create([
                'user_id'     => $user->id,
                'kelas_id'    => $data['kelas_id'],
                'nim'         => $data['nim'],
                'nama'        => $data['nama'],
                'email'       => $data['email'],
                'status_akun' => 'pending_upload',
            ]);
        });
    }

    public function update(Mahasiswa $mahasiswa, array $data): Mahasiswa
    {
        DB::transaction(function () use ($mahasiswa, $data) {
            $mahasiswa->update([
                'kelas_id' => $data['kelas_id'],
                'nim'      => $data['nim'],
                'nama'     => $data['nama'],
                'email'    => $data['email'],
            ]);

            if ($mahasiswa->user) {
                $mahasiswa->user->update([
                    'name'  => $data['nama'],
                    'email' => $data['email'],
                ]);
            }
        });

        return $mahasiswa->fresh();
    }

    public function destroy(Mahasiswa $mahasiswa): void
    {
        DB::transaction(function () use ($mahasiswa) {
            $userId = $mahasiswa->user_id;
            $mahasiswa->delete();
            if ($userId) {
                User::destroy($userId);
            }
        });
    }
}
