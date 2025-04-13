# Anbar İdarəetmə Sistemi 🏭

![Dashboard](https://github.com/ebulfez21/warehouse-management/blob/main/src/img/esas.png)

Anbar İdarəetmə Sistemi, məhsulların və anbar əməliyyatlarının idarə edilməsi üçün müasir və effektiv bir veb tətbiqdir.

## 🌟 Əsas Xüsusiyyətlər

- 📦 Məhsul idarəetməsi
  - Məhsulların əlavə edilməsi və redaktəsi
  - Stokların avtomatik hesablanması
  - Çəki və miqdar izləmə
  
- 📊 Ətraflı hesabatlar
  - Giriş/çıxış əməliyyatları
  - Məhsul hərəkətləri
  - Aylıq trend analizi
  - Excel və PDF ixrac
  
- 👥 İstifadəçi idarəetməsi
  - Rol əsaslı giriş
  - İcazələrin idarə edilməsi
  - Təhlükəsiz autentifikasiya

## 🚀 Texnologiyalar

- React.js
- TypeScript
- Firebase/Firestore
- TailwindCSS
- Recharts
- Lucide Icons

## 📸 Ekran Görüntüləri

### Əsas Səhifə
![Dashboard](https://github.com/ebulfez21/warehouse-management/blob/main/src/img/esas.png)
Əsas səhifədə ümumi statistika və son əməliyyatlar göstərilir.

### Məhsullar
![Products](https://github.com/ebulfez21/warehouse-management/blob/main/src/img/m%C9%99hsul.png)
Məhsulların idarə edilməsi və stok izləmə.

### Hesabatlar
![Reports](https://github.com/ebulfez21/warehouse-management/blob/main/src/img/hesabat.png)
Ətraflı hesabatlar və analitika.

### İstifadəçılər
![Reports](https://github.com/ebulfez21/warehouse-management/blob/main/src/img/istifad%C9%99ci.png)
İstifadəçi İdarəetməsi.

## 🛠️ Quraşdırma

1. Repo-nu klonlayın:
```bash
git clone https://github.com/ebulfez21/warehouse-management.git
```

2. Asılılıqları yükləyin:
```bash
cd warehouse-management
npm install
```

3. Firebase konfiqurasiyasını yaradın:
   - Firebase Console-dan yeni layihə yaradın
   - Firestore və Authentication xidmətlərini aktivləşdirin
   - Firebase konfiqurasiya məlumatlarını `src/firebase.ts` faylına əlavə edin

4. Development serverini başladın:
```bash
npm run dev
```

## 👥 İstifadəçi Rolları

### Admin
- Bütün sistemə tam giriş
- İstifadəçiləri idarə etmək
- Məhsulları silmək

### İstifadəçi
- Məhsulları əlavə etmək və redaktə etmək
- Hesabatları görmək
- Əməliyyatları idarə etmək

## 📝 İcazələr

- `canAddProducts`: Məhsul əlavə etmək və redaktə etmək
- `canManageTransactions`: Giriş/çıxış əməliyyatlarını idarə etmək
- `canViewReports`: Hesabatları görmək
- `canDeleteProducts`: Məhsulları silmək (yalnız admin)

## 🔒 Təhlükəsizlik

- Firebase Authentication ilə təhlükəsiz giriş
- Rol əsaslı giriş idarəetməsi
- Firestore təhlükəsizlik qaydaları

## 📊 Hesabat Növləri

1. Ümumi Statistika
   - Məhsul sayı
   - Ümumi çəki
   - Giriş/çıxış miqdarları

2. Məhsul Hərəkətləri
   - Tarix əsaslı filtrlər
   - Məhsul və firma filtri
   - Trend analizi

3. İxrac Seçimləri
   - Excel formatı
   - PDF formatı

## 🤝 Töhfə Vermək

1. Fork edin
2. Feature branch yaradın (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request yaradın

[Ebulfez-GitHub](https://github.com/ebulfez21/warehouse-management.git)
[Ebulfez-Netlify](https://ebulfez-warehouse-management.netlify.app/)

## 🌟 İstifadəki 
1. Email
2. test_warehouse@gmail.com
3. Şifrə
4. admin123