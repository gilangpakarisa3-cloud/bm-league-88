# Panduan Deploy ke Firebase

Dokumen ini berisi panduan dan referensi langkah demi langkah untuk mendeploy aplikasi **BM LEAGUE 88** ke akun Firebase Anda.

---

### Informasi Project Firebase
- **Google Account**: `gilangpakarisa3@gmail.com`
- **Project ID**: `studio-2162727345-cf90e`
- **Project Number**: `102552922602`
- **Frontend / Fullstack Framework**: Next.js 15 (App Router)

---

## 1. Persiapan Awal

Pastikan Node.js dan Firebase CLI sudah terinstall di komputer Anda.

Jika belum menginstall Firebase CLI:
```bash
npm install -g firebase-tools
```

---

## 2. Login ke Akun Firebase

Jalankan perintah berikut di terminal:
```bash
firebase login
```
> Pastikan saat browser terbuka, pilih login menggunakan akun **`gilangpakarisa3@gmail.com`**.

Jika menggunakan terminal tanpa GUI / browser otomatis:
```bash
firebase login --no-localhost
```

Untuk memverifikasi akun yang sedang aktif:
```bash
firebase login:list
```

---

## 3. Pastikan Target Project Mengarah ke Project ID Anda

Cek project yang aktif di direktori proyek:
```bash
firebase use
```

Jika belum terpilih, arahkan ke project ID Anda:
```bash
firebase use studio-2162727345-cf90e
```

---

## 4. Opsi Deployment

Aplikasi ini menggunakan **Next.js 15**. Terdapat 2 opsi deployment yang didukung oleh Firebase:

### Opsi A: Firebase App Hosting (Rekomendasi untuk Next.js SSR & Server Action)
Konfigurasi file [apphosting.yaml](file:///d:/Website/Antigravity/BM%20LEAGUE%2088/apphosting.yaml) dan [firebase.json](file:///d:/Website/Antigravity/BM%20LEAGUE%2088/firebase.json) sudah otomatis terpasang untuk Firebase App Hosting.

1. Buka [Firebase Console](https://console.firebase.google.com/project/studio-2162727345-cf90e/apphosting).
2. Hubungkan repository GitHub proyek ini ke Firebase App Hosting.
3. Backend akan otomatis dibuat (`backendId: studio`) dan melakukan build & deploy setiap kali Anda push commit ke branch utama (`main` / `master`).

Atau jika mendeploy Firestore Rules & Indexes secara manual:
```bash
firebase deploy --only firestore
```

---

### Opsi B: Firebase Hosting Standar (Static / Web Frameworks CLI)
Jika Anda ingin deploy langsung via Firebase CLI dari komputer lokal:

1. **Deploy Firestore Rules & Index**:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

2. **Deploy Aplikasi / Hosting**:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

---

## 5. Ringkasan Perintah Penting (Cheat Sheet)

| Perintah | Deskripsi |
| :--- | :--- |
| `firebase login` | Login ke akun Firebase Google Anda |
| `firebase projects:list` | Melihat daftar project Firebase yang Anda miliki |
| `firebase use studio-2162727345-cf90e` | Memilih project aktif |
| `firebase deploy --only firestore:rules` | Deploy aturan keamanan Firestore (`firestore.rules`) |
| `firebase deploy --only firestore:indexes` | Deploy index komposit Firestore (`firestore.indexes.json`) |
| `firebase deploy` | Deploy seluruh resource yang terdaftar |

