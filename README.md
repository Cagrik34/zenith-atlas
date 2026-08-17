# Zenith Atlas

### Çoklu Varlık Portföy Yönetimi & Kantitatif Risk Terminali

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![TEFAS Veritabanı](https://img.shields.io/badge/TEFAS-1.051%20Fon-indigo?style=flat-square)](src/data/funds_db.json)
[![Piyasa Akışı](https://img.shields.io/badge/Canlı%20Veri-WebSocket-emerald?style=flat-square)](https://canlidoviz.com)
[![Mimari](https://img.shields.io/badge/Mimari-İstemci%20Taraflı%20(Zero--Server)-slate?style=flat-square)](index.html)

Zenith Atlas; Borsa İstanbul pay senetleri, ABD hisse senetleri (NYSE/NASDAQ), TEFAS fonları (1.051 fon), Kapalıçarşı kıymetli madenler ve döviz kurlarını tek arayüzde birleştiren, istemci taraflı çalışan bir finansal analiz ve portföy takip terminalidir.

Kullanıcı verilerini tamamen yerel tarayıcı hafızasında saklar; harici bir kullanıcı veritabanı gerektirmeden gerçek zamanlı fiyatlama, vergi simülasyonları, kantitatif risk metrikleri ve uzun vadeli varlık projeksiyonları sunar.

---

## 🚀 Hızlı Başlangıç

1. Depoyu klonlayın veya indirin:
   ```bash
   git clone https://github.com/Cagrik34/zenith-atlas.git
   ```
2. **`index.html`** dosyasını herhangi bir modern web tarayıcısında açın.
3. Canlı piyasa ve fon verilerini yerel olarak güncellemek için (isteğe bağlı):
   ```bash
   pip install -r requirements.txt
   python src/scripts/sync.py
   ```
   *(veya Windows üzerinde doğrudan `sync.bat` dosyasını çalıştırabilirsiniz).*

---

## 🎯 Temel Modüller & Fonksiyonlar

### 1. 📐 Modern Portföy Teorisi & Markowitz Etkin Sınır (Efficient Frontier)
* **Kovaryans Matrisi & Simplex Örnekleme:** 1.500 Monte Carlo Dirichlet simülasyonu ile portföyün risk-getiri uzayındaki tüm olası ağırlık kombinasyonlarını tarar.
* **Maksimum Sharpe & Minimum Varyans:** %50 risksiz faiz oranı (TCMB repo göstergesi) referans alınarak teğet portföy (Max Sharpe) ve en düşük oynaklıklı portföy (Min Variance) ağırlıklarını analitik olarak hesaplar ve tek tıkla uygulama imkanı sunar.

### 2. 📉 Tarihsel Kriz & Geriye Dönük Backtest Simülatörü
* **Gerçek Kriz Senaryoları:** 2020 Küresel Pandemi, 2021 Türk Lirası Kur Şoku, 2022 Jeopolitik & Emtia Şoku, 2023-2024 %50 Faiz & Parasal Sıkılaşma, 2018 Döviz Sıçraması.
* **Kantitatif Stres Metrikleri:** Portföyün geçmiş kriz pencerelerindeki maksimum dip çöküşü (Max Drawdown), krizden toparlanma süresi (İş Günü), BIST 100 / Gram Altın / USD karşılaştırmalı getiri yörüngesi ve varlık bazlı şok kalkanı analizi.

### 3. 💵 Akıllı Temettü & Pasif Gelir Nakit Akışı Matrisi
* **12 Aylık Dağıtım Takvimi:** Türk sermaye piyasaları ve fon dağıtım ritimlerine (Mart-Nisan temettü sezonu, üçer aylık kuponlar) göre aylık pasif nakit projeksiyonu.
* **Ağırlıklı Temettü Verimi & DRIP:** Portföyün ağırlıklı temettü verimi (%), aylık ortalama pasif maaş ve temettülerin yeniden yatırıma yönlendirilmesi (DRIP - Dividend Reinvestment Plan) durumunda 10 yıllık ek bileşik sermaye katkısı.

### 4. 📲 Progressive Web App (PWA) & Çevrimdışı Native Terminal
* **Offline-First Mimari:** `sw.js` Service Worker önbelleklemesi ile internet bağlantısı kesildiğinde veya uçuş modunda dahi tüm analitik motorlar, 1.051 TEFAS fon veritabanı ve portföy hesaplamaları yerel olarak çalışır.
* **Masaüstü & Mobil Kurulum:** `manifest.webmanifest` desteğiyle Windows, macOS, Linux, iOS ve Android cihazlara bağımsız bir masaüstü/mobil uygulama olarak yüklenebilir.

### 5. 💱 Çoklu Para Birimi & Reel Değerleme Motoru
* **Desteklenen Birimler:** `TRY`, `USD`, `EUR`, `Gram Altın`.
* Portföy büyüklüğünü, kâr/zarar durumunu ve varlık dağılımını döviz ve fiziki altın bazında anlık olarak hesaplar; portföyün reel satın alma gücünü izler.

### 6. ⚡ Stopaj ve Vergi Optimizasyonu Modülü
* Güncel sermaye piyasası ve fon vergi mevzuatına uygun brüt/net getiri analizi.
* Hisse senedi yoğun fonlar ve BIST hisselerinde geçerli %0 stopaj muafiyetinin net getiriye katkısını simüle eder ve portföy bazında vergi yükünü hesaplar.

### 7. 🎯 Hedef Odaklı Varlık & Finansal Planlama Simülatörü
* Düzenli birikim, beklenen bileşik getiri (CAGR) ve enflasyon düzeltmesi içeren hedef projeksiyon modelleri.
* Finansal özgürlük (FIRE), gayrimenkul ve birikim hedefleri için tahmini vade ve sermaye eğrisi hesaplamaları.

### 8. 🔔 Eşik & Fiyat Uyarı Sistemi
* Canlı piyasa akışına entegre fiyat, getiri ve portföy eşik alarmları.
* Hedef kur/fiyat seviyeleri ve günlük hareket sınırları için Web Audio API ve tarayıcı masaüstü bildirimleri desteği.

### 9. 🖨️ Yönetici Portföy Özeti & A4/PDF Çıktısı
* Varlık dağılımı, risk metrikleri (Sharpe, Sortino, VaR, Beta) ve performans tablolarını içeren, standart A4 yazdırma ve PDF aktarımına uygun kurumsal raporlama.

### 10. ⏱️ Piyasa ve Seans Takibi
* Borsa İstanbul, TEFAS Fon İşlem Saatleri, ABD Borsaları (NYSE/NASDAQ), Serbest Piyasa ve Kripto piyasalarının seans açılış/kapanış zamanlarını gösteren dinamik durum göstergesi.

### 11. ⚔️ TEFAS Fon Karşılaştırma Modülü
* 1.051 TEFAS yatırım fonu arasından seçilen fonları fiyat, 1 yıllık getiri, yönetim ücreti, stopaj oranı, valör süresi ve risk kategorisi kriterlerine göre yan yana karşılaştırma.

### 12. 📢 Makroekonomik Göstergeler & Resmî Bülten Paneli
* TCMB Politika Faizi, SPK düzenlemeleri ve resmî duyuruları kaynak bağlantılarıyla birlikte gösteren makroekonomik bilgi paneli.

---

## 📁 Proje Mimarisi

```text
Zenith-Atlas/
├── 📄 index.html                           # Terminal ana kullanıcı arayüzü
├── 📄 manifest.webmanifest                 # Standart PWA Web Manifest dosyası
├── 📄 sw.js                                # Çevrimdışı ve önbellek Service Worker motoru
├── 📄 sync.bat                             # Windows veri güncelleme betiği
├── 📄 requirements.txt                     # Python bağımlılıkları
├── 📄 .gitignore                           # Git konfigürasyonu
├── 📄 README.md                            # Proje dokümantasyonu
├── 📄 LICENSE                              # MIT Lisansı
│
├── 📁 src/                                 # Kaynak kodlar
│   ├── 📁 css/
│   │   └── 📄 styles.css                   # Arayüz ve tema stilleri
│   ├── 📁 js/
│   │   └── 📄 app.js                       # Portföy motoru, WebSocket ve hesaplama mantığı
│   ├── 📁 icons/                           # PWA uygulama ikonları
│   │   ├── 📄 icon-192.png                 # 192x192 uygulama ikonu
│   │   └── 📄 icon-512.png                 # 512x512 yüksek çözünürlüklü ikon
│   ├── 📁 data/                            # Veri katmanı
│   │   ├── 📄 funds_db.json                # 1.051 TEFAS Fonu veri tabanı
│   │   ├── 📄 funds_db.js                  # Çevrimdışı fon verisi
│   │   ├── 📄 markets.json                 # Canlı piyasa ve kur verileri
│   │   ├── 📄 markets.js                   # Çevrimdışı piyasa verisi
│   │   ├── 📄 prices.json                  # Örnek fiyat verileri
│   │   ├── 📄 prices.js                    # Çevrimdışı fiyat verisi
│   │   ├── 📄 news.json                    # Makroekonomik bülten verisi
│   │   └── 📄 news.js                      # Çevrimdışı makro veri
│   └── 📁 scripts/
│       └── 📄 sync.py                      # Canlı veri senkronizasyon motoru
│
└── 📁 docs/
    └── 📄 portfolio-model.xlsx             # Portföy modelleme tablosu
```

---

## 🛡️ Güvenlik ve Gizlilik Prensipleri

* **İstemci Taraflı Gizlilik (Zero Data Transmission):** Tüm portföy ve işlem verileri yalnızca kullanıcının yerel tarayıcısında (`localStorage`) tutulur; herhangi bir uzak sunucuya aktarılmaz.
* **Content Security Policy (CSP):** Yalnızca tanımlı ve güvenli CDN/API kaynaklarına izin veren kısıtlayıcı güvenlik başlıkları.
* **Subresource Integrity (SRI):** CDN üzerinden yüklenen harici kütüphaneler için SHA-384 kriptografik doğrulama.
* **XSS Sanitizasyonu:** Kullanıcı girdileri ve dış kaynaklı veriler render edilmeden önce sanitize edilir.
* **CSV/DDE Enjeksiyon Koruması:** Excel/CSV dışa aktarımlarında formül enjeksiyonu (`=`, `+`, `-`, `@`) engellenir.

---

## 👨‍💻 Geliştirici

**Çağrı Giray Keşan**  
*Frontend-Heavy Full-Stack Engineer | AI Intern @ Microsoft*  
* GitHub: [@Cagrik34](https://github.com/Cagrik34)  
* LinkedIn: [in/cagrigiraykesan](https://www.linkedin.com/in/cagrigiraykesan)

---

## 📄 Lisans & Yasal Uyarı

Bu proje [MIT Lisansı](LICENSE) altında sunulmaktadır.

**Yasal Bilgilendirme:** Bu yazılım yalnızca kişisel analiz, eğitim ve portföy izleme amacıyla geliştirilmiştir; herhangi bir yatırım tavsiyesi, alım-satım önerisi veya portföy yöneticiliği hizmeti içermez. Piyasa verileri kamuya açık kaynaklardan bilgilendirme amaçlı temin edilmektedir.
