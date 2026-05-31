<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDosenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'jurusan_id' => ['required', 'exists:jurusan,id'],
            'nip'        => ['required', 'string', 'max:50', Rule::unique('dosen', 'nip')->ignore($this->route('dosen'))],
            'nama'       => ['required', 'string', 'max:255'],
            'email'      => ['required', 'email', 'max:255', Rule::unique('dosen', 'email')->ignore($this->route('dosen'))],
        ];
    }
}
