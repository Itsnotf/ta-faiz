<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMahasiswaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'kelas_id' => ['required', 'exists:kelas,id'],
            'nim'      => ['required', 'string', 'max:50', Rule::unique('mahasiswa', 'nim')->ignore($this->route('mahasiswa'))],
            'nama'     => ['required', 'string', 'max:255'],
        ];
    }
}
