<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMahasiswaRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $mahasiswaId = $this->route('mahasiswa')?->id;

        return [
            'kelas_id' => ['required', 'exists:kelas,id'],
            'nim'      => ['required', 'string', 'max:50',
                Rule::unique('mahasiswa', 'nim')->ignore($mahasiswaId)],
            'nama'     => ['required', 'string', 'max:255'],
            'email'    => [
                'required', 'email', 'max:255',
                Rule::unique('mahasiswa', 'email')->ignore($mahasiswaId),
                Rule::unique('users', 'email')->ignore(
                    $this->route('mahasiswa')?->user_id
                ),
            ],
        ];
    }
}
