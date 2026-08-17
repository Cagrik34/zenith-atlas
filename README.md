# Zenith Atlas

### Evrensel Çoklu Varlık Portföy Yönetimi & Kantitatif Risk Terminali

[![Version: 2.0.0](https://img.shields.io/badge/Versiyon-v2.0.0%20(Kurumsal)-emerald?style=flat-square)](index.html)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![TEFAS Veritabanı](https://img.shields.io/badge/TEFAS-1.051%20Fon-indigo?style=flat-square)](src/data/funds_db.json)
[![Piyasa Akışı](https://img.shields.io/badge/Canlı%20Veri-WebSocket%20%2B%20Failover-emerald?style=flat-square)](https://canlidoviz.com)
[![Mimari](https://img.shields.io/badge/Mimari-İstemci%20Taraflı%20(Zero--Server)-slate?style=flat-square)](index.html)

Zenith Atlas; Borsa İstanbul pay senetleri (BIST), ABD hisse senetleri (NYSE/NASDAQ), TEFAS fonları (1.051 fon), Kapalıçarşı serbest piyasa kıymetli madenleri ve canlı döviz kurlarını tek çatı altında birleştiren kurumsal düzeyde bir finansal analiz, portföy takip ve kantitatif risk simülasyon terminalidir.

Kullanıcı verilerini tamamen yerel tarayıcı hafızasında (`localStorage` & `IndexedDB`) saklar; sıfır sunucu (Zero-Server / Zero-Data-Transmission) mimarisiyle harici bir veritabanı gerektirmeden gerçek zamanlı saliselik WebSocket fiyatlaması, çoklu bağımsız portföy/BES yönetimi, kur vs. reel varlık getirisi ayrıştırması (FX Attribution), 2026 resmi 9075 sayılı karar stopaj optimizasyonu, Markowitz modern portföy teorisi ve BYOK (Bring Your Own Key) yapay zeka asistanı sunar.

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

### 1. 💼 Çoklu Portföy & BES / Emeklilik Yönetim Masası (Multi-Portfolio Profiles)
* **Bağımsız Profil Yönetimi:** `[ 🏢 Ana Portföy ]`, `[ 🛡 BES & Emeklilik Fonları ]`, `[ 💵 Temettü Portföyü ]` ve `[ 🚀 Kısa Vadeli Al-Sat ]` gibi sınırsız bağımsız portföy oluşturma ve tek tıkla anında geçiş.
* **Konsolide Net Varlık Konsolu:** Tüm portföylerin toplam piyasa değerini ve bağımsız nakit havuzlarını birleşik konsolide özette izleme.

### 2. 💱 Kur Kazancı vs. Reel Varlık Getirisi Ayrıştırma Masası (FX Attribution Engine)
* **Brinson-Fachler Multiplicative Attribution:** Yabancı hisse/teknoloji fonları (`AFT`, `YAY`, `IJC`) ve kıymetli maden fonlarında (`KZL`, `GGK`) toplam karın ne kadarının **Dolar (USD/TRY) kur artışından**, ne kadarının **varlığın kendi reel getirisinden (Alfa)** kaynaklandığını ₺ ve % bazında ayrıştırır.
* **Görsel Katkı Çubukları:** Dolar/Kur hassasiyeti oranı (%) ve portföyün döviz kalkanı gücünü netleştirir.

### 3. 🧠 Zenith AI - BYOK (Bring Your Own Key) LLM Analisti & Quant Raporlama Motoru
* **%100 Gizli İstemci Taraflı BYOK:** Kullanıcının kendi **Anthropic (Claude 3.5 Sonnet)**, **OpenAI (GPT-4o)**, **Google Gemini (Gemini 1.5 Pro)**, **Groq** veya **DeepSeek** API anahtarını yerel tarayıcısında şifreli saklayarak doğrudan resmi AI uç noktalarına bağlanma.
* **Kantitatif Prompt Sentezi:** Portföyün 1.051 TEFAS fon ağırlığı, 2026 stopaj yükümlülükleri, Sharpe rasyosu ve kriz stres testi sonuçlarını toparlayıp tek tıkla kurumsal düzeyde Chief Investment Officer (CIO) Yönetici Notu üretir.
* **Yerel Heuristic Fallback:** API anahtarı olmadan da anında çalışan yerel donanım hızlandırmalı deterministik analiz motoru.

### 4. 🔌 Soyutlanmış DataProvider & Otomatik WebSocket Failover Mimarisi
* **Modüler Veri Arayüzü:** CanlıDöviz Socket.IO, Harem Altın Kapalıçarşı WebSocket, Bigpara BIST motoru ve Yahoo Finance servislerini tek bir `DataProvider` arayüzü arkasında birleştirir.
* **Kesintisiz Çevrimdışı Geçiş:** Bağlantı kopmalarında arayüzü dondurmadan otomatik retry backoff ve statik yerel veri katmanına (`markets.js`, `prices.js`) şeffaf geçiş sağlar.

### 5. 📐 Modern Portföy Teorisi & Markowitz Etkin Sınır (Efficient Frontier)
* **Kovaryans Matrisi & Simplex Örnekleme:** 1.500 Monte Carlo Dirichlet simülasyonu ile portföyün risk-getiri uzayındaki tüm olası ağırlık kombinasyonlarını tarar.
* **Maksimum Sharpe & Minimum Varyans:** %50 risksiz faiz oranı (TCMB repo göstergesi) referans alınarak teğet portföy (Max Sharpe) ve en düşük oynaklıklı portföy (Min Variance) ağırlıklarını analitik olarak hesaplar ve tek tıkla uygulama imkanı sunar.

### 6. 📉 Tarihsel Kriz & Geriye Dönük Backtest Simülatörü
* **Gerçek Kriz Senaryoları:** 2020 Küresel Pandemi, 2021 Türk Lirası Kur Şoku, 2022 Jeopolitik & Emtia Şoku, 2023-2024 %50 Faiz & Parasal Sıkılaşma, 2018 Döviz Sıçraması.
* **Kantitatif Stres Metrikleri:** Portföyün geçmiş kriz pencerelerindeki maksimum dip çöküşü (Max Drawdown), krizden toparlanma süresi (İş Günü), BIST 100 / Gram Altın / USD karşılaştırmalı getiri yörüngesi ve varlık bazlı şok kalkanı analizi.

### 7. 💵 Akıllı Temettü & Pasif Gelir Nakit Akışı Matrisi
* **12 Aylık Dağıtım Takvimi:** Türk sermaye piyasaları ve fon dağıtım ritimlerine (Mart-Nisan temettü sezonu, üçer aylık kuponlar) göre aylık pasif nakit projeksiyonu.
* **Ağırlıklı Temettü Verimi & DRIP:** Portföyün ağırlıklı temettü verimi (%), aylık ortalama pasif maaş ve temettülerin yeniden yatırıma yönlendirilmesi (DRIP - Dividend Reinvestment Plan) durumunda 10 yıllık ek bileşik sermaye katkısı.

### 8. 📲 Progressive Web App (PWA) & Çevrimdışı Native Terminal (v2.0)
* **Offline-First Mimari:** `sw.js` Service Worker önbelleklemesi (`zenith-atlas-cache-v2.0.0`) ile internet bağlantısı kesildiğinde dahi tüm analitik motorlar, 1.051 TEFAS fon veritabanı ve portföy hesaplamaları yerel olarak çalışır.
* **Masaüstü & Mobil Kurulum:** `manifest.webmanifest` desteğiyle Windows, macOS, Linux, iOS ve Android cihazlara bağımsız bir masaüstü/mobil uygulama olarak yüklenebilir.

### 9. 💱 Çoklu Para Birimi & Reel Değerleme Motoru
* **Desteklenen Birimler:** `TRY`, `USD`, `EUR`, `Gram Altın`.
* Portföy büyüklüğünü, kar/zarar durumunu ve varlık dağılımını döviz ve fiziki altın bazında anlık olarak hesaplar; portföyün reel satın alma gücünü izler.

### 10. ⚡ Stopaj ve Vergi Optimizasyonu Modülü (2026 9075 Sayılı Karar Uyumlu)
* 2026 resmi fon stopaj oranları (%7.5 / %10) ve GVK Geçici 67. Madde kapsamındaki %0 hisse senedi muafiyetiyle net getiri analizi.

### 11. 🎯 Hedef Odaklı Varlık & Finansal Planlama Simülatörü
* Düzenli birikim, beklenen bileşik getiri (CAGR) ve enflasyon düzeltmesi içeren FIRE ve gayrimenkul hedef projeksiyon modelleri.

### 12. 🔔 Eşik & Fiyat Uyarı Sistemi
* Canlı piyasa akışına entegre fiyat, getiri ve portföy eşik alarmları (Web Audio API ve tarayıcı bildirimleri).

### 13. 🖨 Yönetici Portföy Özeti & A4/PDF Çıktısı
* Varlık dağılımı, risk metrikleri (Sharpe, Sortino, VaR, Beta) ve performans tablolarını içeren kurumsal raporlama.

### 14. ⚔ TEFAS Fon Karşılaştırma & Seans Takibi
* 1.051 TEFAS yatırım fonu arasında çoklu karşılaştırma ve küresel borsa seans saatleri paneli.

### 15. 🏛 Black-Litterman Varlık Tahsis & Piyasa Görüşü Modeli (Goldman Sachs Mimarisi)
* Klasik Markowitz modelinin aşırı yoğunlaşma sorununu çözen, piyasa dengesi (CAPM) ile yatırımcı beklentilerini Bayesyen istatistikle birleştiren kurumsal portföy tahsisi.
* Dinamik profil hafızası ile Ana Portföy, BES ve Temettü profillerine özel piyasa görüşü yönetimi.

### 16. 🌳 Hiyerarşik Risk Paritesi (HRP) & Kuyruk Riski Masası
* Marcos Lopez de Prado makine öğrenimi tek-bağlantılı kümeleme ağacı ile kovaryans matrisinin tersini almadan hesaplanan en sağlam risk paritesi dağılımı.
* **Kuyruk Riski Metrikleri:** %99 Güven Düzeyinde CVaR (Expected Shortfall), TCMB Repo Hurdle (%50) Omega Rasyosu, Ulcer Index (Çöküş Stresi) ve Çeşitlendirme Entropisi.

### 17. 🎯 Akıllı Nakit Yönlendirici & Vergisiz Rebalancing (Smart Cash Router)
* Mevcut varlıkları satıp stopaj ve komisyon kaybı yaşamadan, aylık taze nakit akışını (DCA / temettü) hedef strateji ağırlıklarına göre paylaştıran tam sayılı optimizasyon motoru.

### 18. 🧭 Makroekonomik Rejim Tespiti & Taktiksel Varlık Rotasyonu
* TCMB politika faizi, TÜFE enflasyonu ve döviz trendlerine göre otomatik rejim tespiti (Negatif Reel Faiz, Sıkı Para / Getiri Kalkanı, Kriz Savunması) ve modele uygun varlık rotasyonu matrisi.

### 19. 📲 Sıfır-Sunucu P2P Dinamik QR Portföy Işınlayıcı (Dynamic QR Beam)
* Sıfır sunucu ile istemci tarafında sıkıştırılmış ve Base64 URL fragment olarak kodlanmış dinamik QR kod akışı sayesinde portföyü masaüstünden mobil cihaza saniyeler içinde şifreli aktarma.

---

## 📁 Proje Mimarisi

```text
Zenith-Atlas/
├── 📄 .gitattributes                       # Git satır sonu ve dosya normalizasyon kuralları
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

## 🛡 Güvenlik ve Gizlilik Prensipleri

* **İstemci Taraflı Gizlilik (Zero Data Transmission):** Tüm portföy ve işlem verileri yalnızca kullanıcının yerel tarayıcısında (`localStorage`) tutulur; herhangi bir uzak sunucuya aktarılmaz.
* **Content Security Policy (CSP):** Yalnızca tanımlı ve güvenli CDN/API kaynaklarına izin veren kısıtlayıcı güvenlik başlıkları.
* **Subresource Integrity (SRI):** CDN üzerinden yüklenen harici kütüphaneler için SHA-384 kriptografik doğrulama.
* **XSS Sanitizasyonu:** Kullanıcı girdileri ve dış kaynaklı veriler render edilmeden önce sanitize edilir.
* **CSV/DDE Enjeksiyon Koruması:** Excel/CSV dışa aktarımlarında formül enjeksiyonu (`=`, `+`, `-`, `@`) engellenir.

---

## 👨💻 Geliştirici

**Çağrı Giray Keşan**  
*Frontend-Heavy Full-Stack Engineer | AI Intern @ Microsoft*  
* GitHub: [@Cagrik34](https://github.com/Cagrik34)  
* LinkedIn: [in/cagrigiraykesan](https://www.linkedin.com/in/cagrigiraykesan)

---

## 📄 Lisans & Yasal Uyarı

Bu proje [MIT Lisansı](LICENSE) altında sunulmaktadır.

**Yasal Bilgilendirme:** Bu yazılım yalnızca kişisel analiz, eğitim ve portföy izleme amacıyla geliştirilmiştir; herhangi bir yatırım tavsiyesi, alım-satım önerisi veya portföy yöneticiliği hizmeti içermez. Piyasa verileri kamuya açık kaynaklardan bilgilendirme amaçlı temin edilmektedir.
