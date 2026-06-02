<?php

namespace App\Services;

use App\Models\Dosen;
use App\Models\Jurusan;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DosenService
{
    public function index(?string $search, ?int $jurusanId, bool $isSuperAdmin): LengthAwarePaginator
    {
        return Dosen::query()
            ->with(['jurusan', 'user'])
            ->withCount('enrollmentVerifikasi')
            ->when(!$isSuperAdmin && $jurusanId, fn($q) => $q->where('jurusan_id', $jurusanId))
            ->when($search, fn($q) => $q->where(fn($q2) =>
                $q2->where('nama', 'like', "%{$search}%")
                   ->orWhere('nip', 'like', "%{$search}%")
            ))
            ->latest()
            ->paginate(config('starterkit.pagination'))
            ->withQueryString();
    }

    public function getJurusanOptions(?int $jurusanId, bool $isSuperAdmin): Collection
    {
        return Jurusan::query()
            ->when(!$isSuperAdmin && $jurusanId, fn($q) => $q->where('id', $jurusanId))
            ->orderBy('nama')
            ->get(['id', 'nama']);
    }

    public function store(array $data): Dosen
    {
        return DB::transaction(function () use ($data) {
            $user = User::create([
                'name'              => $data['nama'],
                'email'             => $data['email'],
                'password'          => Hash::make('Password@123'),
                'email_verified_at' => now(),
            ]);
            $user->syncRoles('dosen');

            return Dosen::create([
                'user_id'    => $user->id,
                'jurusan_id' => $data['jurusan_id'],
                'nip'        => $data['nip'],
                'nama'       => $data['nama'],
                'email'      => $data['email'],
            ]);
        });
    }

    public function update(Dosen $dosen, array $data): Dosen
    {
        DB::transaction(function () use ($dosen, $data) {
            $dosen->update([
                'jurusan_id' => $data['jurusan_id'],
                'nip'        => $data['nip'],
                'nama'       => $data['nama'],
                'email'      => $data['email'],
            ]);

            if ($dosen->user) {
                $dosen->user->update([
                    'name'  => $data['nama'],
                    'email' => $data['email'],
                ]);
            }
        });

        return $dosen->fresh();
    }

    public function destroy(Dosen $dosen): void
    {
        DB::transaction(function () use ($dosen) {
            $userId = $dosen->user_id;
            $dosen->delete();
            if ($userId) {
                User::destroy($userId);
            }
        });
    }
}
