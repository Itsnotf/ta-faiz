<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMahasiswaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'kelas_id' => ['required', 'exists:kelas,id'],
            'nim'      => ['required', 'string', 'max:50', 'unique:mahasiswa,nim'],
            'nama'     => ['required', 'string', 'max:255'],
        ];
    }
}
