<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRuanganRequest extends FormRequest
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
            'kode'       => ['required', 'string', 'max:50', Rule::unique('ruangan', 'kode')->ignore($this->route('ruangan'))],
            'kapasitas'  => ['required', 'integer', 'min:1'],
            'cctv_url'   => ['nullable', 'string', 'max:255'],
        ];
    }
}
