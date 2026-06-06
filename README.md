# BM LEAGUE 88 - Official Station

Selamat datang di repositori sistem manajemen Liga Tarkam Engineering EightyEight. Aplikasi ini dirancang untuk pelacakan skor real-time, manajemen kompetisi (Single, Co-Op, Hybrid), dan dokumentasi karir pemain elit.

## 📊 Sistem Perhitungan OVR (Overall Rating)

OVR dalam sistem ini mencerminkan **Efisiensi Poin Karir** seorang pemain di seluruh musim yang pernah diikuti.

### Formula Dasar
Sistem menggunakan bobot poin standar (W:3, D:1, L:0):
1. **Possible Points**: `Total Pertandingan x 3`
2. **Actual Points**: `(Total Menang x 3) + (Total Seri x 1)`
3. **OVR Rating**: `(Actual Points / Possible Points) x 100`

### Aturan Distribusi Statistik
- **Update Otomatis**: Statistik karir diperbarui secara real-time setiap kali pertandingan diselesaikan (Completed) di halaman Jadwal melalui transaksi database yang aman.
- **Mode CO-OP (2v2)**: Hasil pertandingan tim CO-OP berkontribusi 100% terhadap statistik individu masing-masing anggota. Kemenangan tim berarti kemenangan bagi kedua pemain di dalamnya.
- **Master Rank**: Peringkat elit pemain ditentukan berdasarkan OVR tertinggi. Jika terjadi hasil imbang pada nilai OVR, jumlah pertandingan yang lebih banyak (pengalaman) menjadi faktor penentu peringkat.

## 🛠️ Fitur Utama
- **Multi-Format Tournament**: Mendukung liga standar, sistem gugur, dan mode Hybrid (Grup + Double Elimination Playoff).
- **Advanced Performance Analytics**: Analisis tren momentum, probabilitas kemenangan, dan deteksi gaya bermain (Attacking/Defensive).
- **Admin Control Panel**: Manajemen kata sandi terpusat, fitur rekap histori otomatis, dan tools pengundian tim (Manual & Random).
- **Ultra Sport UI**: Antarmuka agresif dengan tema neon-futuristik ala konsol gim terkini.

## 🚀 Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: Firebase Firestore
- **Authentication**: Shared Password System (Client-side sync)
- **Styling**: Tailwind CSS & ShadCN UI
- **Animations**: Framer Motion & Lucide Icons

---
*Verified by Engineering EightyEight Tournament Protocol v5.0*
