<?php

namespace App\Services;

use App\Models\Dosen;
use App\Models\Jadwal;
use App\Models\Kelas;
use App\Models\Ruangan;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class JadwalService
{
    public function index(?string $search, ?int $jurusanId, bool $isSuperAdmin): LengthAwarePaginator
    {
        return Jadwal::query()
            ->with(['kelas.prodi.jurusan', 'dosen', 'ruangan'])
            ->when(!$isSuperAdmin && $jurusanId, fn($q) => $q->whereHas('kelas.prodi', fn($q2) => $q2->where('jurusan_id', $jurusanId)))
            ->when($search, fn($q) => $q->where('mata_kuliah', 'like', "%{$search}%"))
            ->latest()
            ->paginate(config('starterkit.pagination'))
            ->withQueryString();
    }

    public function getDropdownOptions(?int $jurusanId, bool $isSuperAdmin): array
    {
        $kelas = Kelas::query()
            ->with('prodi')
            ->when(!$isSuperAdmin && $jurusanId, fn($q) => $q->whereHas('prodi', fn($q2) => $q2->where('jurusan_id', $jurusanId)))
            ->orderBy('nama')->get(['id', 'nama', 'prodi_id']);

        $dosen = Dosen::query()
            ->when(!$isSuperAdmin && $jurusanId, fn($q) => $q->where('jurusan_id', $jurusanId))
            ->orderBy('nama')->get(['id', 'nama']);

        $ruangan = Ruangan::query()
            ->when(!$isSuperAdmin && $jurusanId, fn($q) => $q->where('jurusan_id', $jurusanId))
            ->orderBy('nama')->get(['id', 'nama', 'kode']);

        return compact('kelas', 'dosen', 'ruangan');
    }

    public function store(array $data): Jadwal
    {
        $this->cekBentrok($data['ruangan_id'], $data['hari'], $data['jam_mulai'], $data['jam_selesai']);
        return Jadwal::create($data);
    }

    public function update(Jadwal $jadwal, array $data): Jadwal
    {
        $this->cekBentrok($data['ruangan_id'], $data['hari'], $data['jam_mulai'], $data['jam_selesai'], $jadwal->id);
        $jadwal->update($data);
        return $jadwal;
    }

    public function destroy(Jadwal $jadwal): void
    {
        $jadwal->delete();
    }

    private function cekBentrok(int $ruanganId, string $hari, string $jamMulai, string $jamSelesai, ?int $excludeId = null): void
    {
        $bentrok = Jadwal::where('ruangan_id', $ruanganId)
            ->where('hari', $hari)
            ->where('is_active', true)
            ->when($excludeId, fn($q) => $q->where('id', '!=', $excludeId))
            ->where(fn($q) => $q
                ->where(fn($q2) => $q2->where('jam_mulai', '<', $jamSelesai)->where('jam_selesai', '>', $jamMulai))
            )
            ->exists();

        if ($bentrok) {
            throw ValidationException::withMessages([
                'jam_mulai' => ['Jadwal bentrok: ruangan sudah dipakai di hari dan jam yang sama.'],
            ]);
        }
    }
}
