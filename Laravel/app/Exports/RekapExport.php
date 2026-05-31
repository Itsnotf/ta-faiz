<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Illuminate\Support\Collection;

class RekapExport implements FromCollection, WithHeadings, WithTitle
{
    public function __construct(private array $rekap) {}

    public function collection(): Collection
    {
        return collect($this->rekap)->map(fn($row, $i) => [
            $i + 1,
            $row['nim'],
            $row['nama'],
            $row['hadir'],
            $row['alpa'],
            $row['izin'],
            $row['sakit'],
            $row['total_pertemuan'],
            $row['persen_hadir'] . '%',
        ]);
    }

    public function headings(): array
    {
        return ['No', 'NIM', 'Nama', 'Hadir', 'Alpa', 'Izin', 'Sakit', 'Total Pertemuan', '% Hadir'];
    }

    public function title(): string
    {
        return 'Rekap Kehadiran';
    }
}
