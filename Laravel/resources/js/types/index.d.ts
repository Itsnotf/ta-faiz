import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
    roles: string[];
    permissions: Permission[];
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    permissions?: string[];
    roles?: string[];
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    sidebarOpen: boolean;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    roles?: Role;
    [key: string]: unknown; // This allows for additional properties...
}

    export interface Permission {
        id: number;
        name: string;
        label: string;
        guard_name: string;
        created_at: string;
        updated_at: string;
        [key: string]: unknown;
    }

export interface Role {
    id: number;
    name: string;
    guard_name: string;
    created_at: string;
    updated_at: string;
    permissions?: Permission[];
}

export interface Institusi {
    id: number;
    nama: string;
    alamat: string;
    logo: string | null;
    created_at: string;
    updated_at: string;
}

export interface Jurusan {
    id: number;
    institusi_id: number;
    nama: string;
    kode: string;
    created_at: string;
    updated_at: string;
    institusi?: Institusi;
}

export interface Prodi {
    id: number;
    jurusan_id: number;
    nama: string;
    kode: string;
    created_at: string;
    updated_at: string;
    jurusan?: Jurusan;
}

export interface Ruangan {
    id: number;
    jurusan_id: number;
    nama: string;
    kode: string;
    kapasitas: number;
    cctv_url: string | null;
    created_at: string;
    updated_at: string;
    jurusan?: Jurusan;
}

export interface Kelas {
    id: number;
    prodi_id: number;
    nama: string;
    angkatan: number;
    created_at: string;
    updated_at: string;
    prodi?: Prodi;
}

export interface Dosen {
    id: number;
    jurusan_id: number;
    nip: string;
    nama: string;
    email: string;
    foto_path: string | null;
    created_at: string;
    updated_at: string;
    jurusan?: Jurusan;
}

export interface Jadwal {
    id: number;
    kelas_id: number;
    dosen_id: number;
    ruangan_id: number;
    mata_kuliah: string;
    hari: 'senin' | 'selasa' | 'rabu' | 'kamis' | 'jumat' | 'sabtu' | 'minggu';
    jam_mulai: string;
    jam_selesai: string;
    window_menit: number;
    window_dosen_menit: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    kelas?: Kelas;
    dosen?: Dosen;
    ruangan?: Ruangan;
}

export interface Mahasiswa {
    id: number;
    user_id: number | null;
    kelas_id: number;
    nim: string;
    nama: string;
    status_akun: 'pending_upload' | 'pending_verifikasi' | 'aktif';
    enrollment_score: number | null;
    foto_verified_at: string | null;
    created_at: string;
    updated_at: string;
    kelas?: Kelas;
}