<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreJurusanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'institusi_id' => ['required', 'exists:institusi,id'],
            'nama'         => ['required', 'string', 'max:255'],
            'kode'         => ['required', 'string', 'max:50', 'unique:jurusan,kode'],
        ];
    }
}
