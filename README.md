# BM LEAGUE 88 - Official Station

Selamat datang di repositori sistem manajemen Liga Tarkam Engineering EightyEight. Aplikasi ini dirancang untuk pelacakan skor real-time, manajemen kompetisi (Single, Co-Op, Hybrid), dan dokumentasi karir pemain elit.

## ⚡ Sistem Peringkat MMR Dinamis (Matchmaking Rating)

Mulai musim ini, sistem beralih menggunakan **Rating MMR Dinamis** dengan sistem bobot Elo kompetitif 1v1 untuk menentukan peringkat elit pemain. Sistem OVR sebelumnya diarsipkan sebagai **Legacy OVR** di rekam jejak historis pemain.

### 1. Modal Awal (Starting MMR)
Pemain diinisialisasi berdasarkan tingkatan performa dan riwayat prestasi gelar juara:
* **Legend (Top Tier Elit)**: `1200 MMR`
* **Top Player (Pro Division)**: `1000 MMR`
* **Reguler (Core Squad)**: `800 MMR`
* **Amateur (Rookie Field)**: `600 MMR`
* **Not Calibrated (Provisional < 20 match)**: `700 MMR` (terbuka penuh setelah 20 pertandingan resmi)
* **Bonus Gelar Juara**: Tambahan `+100 MMR` per gelar juara yang pernah diraih di Hall of Fame.

### 2. Aturan Perolehan MMR Pertandingan (Sistem Bobot Elo 1v1)
Perolehan dan pengurangan MMR dihitung berdasarkan selisih peringkat kedua pemain:

| Kondisi Pertandingan | Selisih MMR | Menang | Kalah | Seri (Draw) |
| :--- | :---: | :---: | :---: | :---: |
| **Seimbang / Rata** | 0 – 50 MMR | $\pm 25$ | $\mp 25$ | $0$ / $0$ |
| **Sedikit Diunggulkan** | 51 – 150 MMR | Unggulan: $+20$ / Underdog: $+30$ | Unggulan: $-20$ / Underdog: $-30$ | Unggulan: $-5$ / Underdog: $+5$ |
| **Sangat Diunggulkan** | 151 – 300 MMR | Unggulan: $+15$ / Underdog: $+35$ | Unggulan: $-15$ / Underdog: $-35$ | Unggulan: $-10$ / Underdog: $+10$ |
| **Underdog Miracle** | > 300 MMR | Unggulan: $+10$ / Underdog: $+40$ | Unggulan: $-10$ / Underdog: $-40$ | Unggulan: $-15$ / Underdog: $+15$ |

### 3. Arsip Legacy OVR
Sistem OVR lama (`(Actual Points / Possible Points) x 100`) tetap tersimpan sebagai rekam jejak historis (*Hall of Fame Legacy*) di profil masing-masing pemain, sehingga pencapaian masa lalu tetap terjaga dengan aman.

## 🛠️ Fitur Utama
- **Multi-Format Tournament**: Mendukung liga standar, sistem gugur, dan mode Hybrid (Grup + Double Elimination Playoff).
- **Advanced Performance Analytics**: Analisis tren momentum, probabilitas kemenangan, dan deteksi gaya bermain (Attacking/Defensive).
- **Admin Control Panel**: Manajemen kata sandi terpusat, fitur rekap histori otomatis, dan tools pengundian tim (Manual & Random).
- **Ultra Sport UI**: Antarmuka agresif dengan tema neon-futuristik ala konsol gim terkini.

---
*Verified by Engineering EightyEight Tournament Protocol v5.0*
