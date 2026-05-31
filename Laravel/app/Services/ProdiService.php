<?php

namespace App\Services;

use App\Models\Jurusan;
use App\Models\Prodi;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class ProdiService
{
    public function index(?string $search, ?int $jurusanId, bool $isSuperAdmin): LengthAwarePaginator
    {
        return Prodi::query()
            ->with('jurusan')
            ->when(!$isSuperAdmin && $jurusanId, fn($q) => $q->where('jurusan_id', $jurusanId))
            ->when($search, fn($q) => $q->where('nama', 'like', "%{$search}%"))
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

    public function store(array $data): Prodi
    {
        return Prodi::create($data);
    }

    public function update(Prodi $prodi, array $data): Prodi
    {
        $prodi->update($data);
        return $prodi;
    }

    public function destroy(Prodi $prodi): void
    {
        $prodi->delete();
    }
}
