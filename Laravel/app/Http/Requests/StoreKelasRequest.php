<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreKelasRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'prodi_id' => ['required', 'exists:prodi,id'],
            'nama'     => ['required', 'string', 'max:255'],
            'angkatan' => ['required', 'integer', 'min:2000', 'max:2099'],
        ];
    }
}
