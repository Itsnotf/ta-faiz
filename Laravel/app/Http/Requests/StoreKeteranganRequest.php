<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreKeteranganRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'absensi_id' => ['required', 'integer', 'exists:absensi_mahasiswa,id'],
            'jenis'      => ['required', 'in:izin,sakit'],
            'keterangan' => ['required', 'string', 'max:1000'],
            'file_bukti' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ];
    }
}
