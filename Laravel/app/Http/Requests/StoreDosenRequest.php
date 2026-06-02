<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDosenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'jurusan_id' => ['required', 'exists:jurusan,id'],
            'nip'        => ['required', 'string', 'max:50', 'unique:dosen,nip'],
            'nama'       => ['required', 'string', 'max:255'],
            'email'      => [
                'required', 'email', 'max:255',
                'unique:dosen,email',
                'unique:users,email',
            ],
        ];
    }
}
