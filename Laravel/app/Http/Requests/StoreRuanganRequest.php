<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRuanganRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'jurusan_id' => ['required', 'exists:jurusan,id'],
            'nama'       => ['required', 'string', 'max:255'],
            'kode'       => ['required', 'string', 'max:50', 'unique:ruangan,kode'],
            'kapasitas'  => ['required', 'integer', 'min:1'],
            'cctv_url'   => ['nullable', 'string', 'max:255'],
        ];
    }
}
