<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreJadwalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'kelas_id'     => ['required', 'exists:kelas,id'],
            'dosen_id'     => ['required', 'exists:dosen,id'],
            'ruangan_id'   => ['required', 'exists:ruangan,id'],
            'mata_kuliah'  => ['required', 'string', 'max:255'],
            'hari'         => ['required', 'in:senin,selasa,rabu,kamis,jumat,sabtu,minggu'],
            'jam_mulai'    => ['required', 'date_format:H:i'],
            'jam_selesai'  => ['required', 'date_format:H:i', 'after:jam_mulai'],
            'window_menit' => ['required', 'integer', 'min:1', 'max:60'],
        ];
    }
}
