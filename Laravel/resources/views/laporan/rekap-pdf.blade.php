<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Rekap Kehadiran</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #111; }
        h2 { text-align: center; margin-bottom: 4px; }
        .meta { text-align: center; color: #555; font-size: 11px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #1e40af; color: #fff; padding: 6px 8px; text-align: center; font-size: 11px; }
        td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
        tr:nth-child(even) td { background: #f9fafb; }
        .text-center { text-align: center; }
        .text-right  { text-align: right; }
        .red    { color: #dc2626; font-weight: bold; }
        .yellow { color: #ca8a04; font-weight: bold; }
        .green  { color: #16a34a; }
        .footer { margin-top: 20px; font-size: 10px; color: #888; text-align: right; }
    </style>
</head>
<body>
    <h2>Rekap Kehadiran Mahasiswa</h2>
    <div class="meta">
        Mata Kuliah: <strong>{{ $info['mata_kuliah'] ?? '—' }}</strong> &nbsp;|&nbsp;
        Kelas: <strong>{{ $info['kelas'] ?? '—' }}</strong> &nbsp;|&nbsp;
        Periode: <strong>{{ $info['dari'] ?? '—' }}</strong> s/d <strong>{{ $info['sampai'] ?? 'sekarang' }}</strong>
    </div>

    <table>
        <thead>
            <tr>
                <th>No</th>
                <th>NIM</th>
                <th>Nama</th>
                <th>Hadir</th>
                <th>Alpa</th>
                <th>Izin</th>
                <th>Sakit</th>
                <th>Total</th>
                <th>% Hadir</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($rekap as $i => $row)
            <tr>
                <td class="text-center">{{ $i + 1 }}</td>
                <td>{{ $row['nim'] }}</td>
                <td>{{ $row['nama'] }}</td>
                <td class="text-center">{{ $row['hadir'] }}</td>
                <td class="text-center">{{ $row['alpa'] }}</td>
                <td class="text-center">{{ $row['izin'] }}</td>
                <td class="text-center">{{ $row['sakit'] }}</td>
                <td class="text-center">{{ $row['total_pertemuan'] }}</td>
                <td class="text-center {{ $row['persen_hadir'] >= 80 ? 'green' : ($row['persen_hadir'] >= 75 ? 'yellow' : 'red') }}">
                    {{ $row['persen_hadir'] }}%
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="footer">Dicetak: {{ now()->format('d/m/Y H:i') }}</div>
</body>
</html>
