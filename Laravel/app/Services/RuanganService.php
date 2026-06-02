<?php

namespace App\Services;

use App\Models\Jurusan;
use App\Models\Ruangan;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class RuanganService
{
    public function index(?string $search, ?string $filterJurusanId, ?int $jurusanId, bool $isSuperAdmin): LengthAwarePaginator
    {
        return Ruangan::query()
            ->with('jurusan')
            ->when(!$isSuperAdmin && $jurusanId, fn($q) => $q->where('jurusan_id', $jurusanId))
            ->when($filterJurusanId, fn($q) => $q->where('jurusan_id', $filterJurusanId))
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

    public function store(array $data): Ruangan
    {
        return Ruangan::create($data);
    }

    public function update(Ruangan $ruangan, array $data): Ruangan
    {
        $ruangan->update($data);
        return $ruangan;
    }

    public function destroy(Ruangan $ruangan): void
    {
        $ruangan->delete();
    }
}
