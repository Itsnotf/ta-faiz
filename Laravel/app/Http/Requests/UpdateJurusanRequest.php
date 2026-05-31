<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateJurusanRequest extends FormRequest
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
            'kode'         => ['required', 'string', 'max:50', Rule::unique('jurusan', 'kode')->ignore($this->route('jurusan'))],
        ];
    }
}
