<?php

namespace App\Services;

use App\Models\Kelas;
use App\Models\Prodi;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class KelasService
{
    public function index(?string $search, ?int $jurusanId, bool $isSuperAdmin): LengthAwarePaginator
    {
        return Kelas::query()
            ->with('prodi.jurusan')
            ->when(!$isSuperAdmin && $jurusanId, fn($q) => $q->whereHas('prodi', fn($q2) => $q2->where('jurusan_id', $jurusanId)))
            ->when($search, fn($q) => $q->where('nama', 'like', "%{$search}%"))
            ->latest()
            ->paginate(config('starterkit.pagination'))
            ->withQueryString();
    }

    public function getProdiOptions(?int $jurusanId, bool $isSuperAdmin): Collection
    {
        return Prodi::query()
            ->with('jurusan')
            ->when(!$isSuperAdmin && $jurusanId, fn($q) => $q->where('jurusan_id', $jurusanId))
            ->orderBy('nama')
            ->get(['id', 'nama', 'jurusan_id']);
    }

    public function store(array $data): Kelas
    {
        return Kelas::create($data);
    }

    public function update(Kelas $kelas, array $data): Kelas
    {
        $kelas->update($data);
        return $kelas;
    }

    public function destroy(Kelas $kelas): void
    {
        $kelas->delete();
    }
}
