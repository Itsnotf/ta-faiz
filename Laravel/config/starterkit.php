<?php

return [

    'pagination' => 10,

    'roles' => ['super_admin', 'admin_jurusan', 'mahasiswa'],

    'default_admin_role' => 'super_admin',

    'permissions' => [
        'users index','users create','users edit','users delete',
        'roles index','roles create','roles edit','roles delete',
        'institusi index','institusi edit',
        'jurusan index','jurusan create','jurusan edit','jurusan delete',
        'prodi index','prodi create','prodi edit','prodi delete',
        'ruangan index','ruangan create','ruangan edit','ruangan delete',
        'dosen index','dosen create','dosen edit','dosen delete',
        'kelas index','kelas create','kelas edit','kelas delete',
        'mahasiswa index','mahasiswa create','mahasiswa edit','mahasiswa delete',
        'jadwal index','jadwal create','jadwal edit','jadwal delete',
        'sesi index',
        'absensi index',
        'keterangan index','keterangan create','keterangan approve',
        'enrollment index',
        'laporan index','laporan export',
    ],

];
