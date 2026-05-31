<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProdiRequest extends FormRequest
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
            'kode'       => ['required', 'string', 'max:50', Rule::unique('prodi', 'kode')->ignore($this->route('prodi'))],
        ];
    }
}
