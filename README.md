# 🌌 Zenith Atlas – Evrensel Çoklu Varlık & Finansal Zekâ Terminali

[![Security: A+](https://img.shields.io/badge/Security-A%2B%20(OWASP%20Certified)-emerald?style=for-the-badge&logo=shield)](file:///index.html)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](file:///LICENSE)
[![TEFAS Veritabanı](https://img.shields.io/badge/TEFAS%20Veritabanı-1.051%20Fon-indigo?style=for-the-badge)](file:///src/data/funds_db.json)
[![Canlı WebSocket](https://img.shields.io/badge/CanliDoviz%20WebSocket-Canlı%20Akış-amber?style=for-the-badge)](https://canlidoviz.com)

**Zenith Atlas, BIST Pay Piyasası, ABD Borsaları (NYSE/NASDAQ), 1.051 Yatırım Fonu (TEFAS), Kapalıçarşı Altın/Gümüş ve Döviz piyasalarını tek çatı altında birleştiren açık kaynaklı, gerçek zamanlı kurumsal finansal zekâ ve portföy terminalidir.**

---

## 🚀 Hızlı Başlangıç

1. **`index.html`** dosyasını tarayıcınızda açın.
2. Çoklu varlıklarınızı, hisse veya fonlarınızı ekleyin; canlı piyasa kurlarını takip edin.
3. Çalışma masaları arasında geçiş yapın: **Genel Bakış**, **Quant & Risk**, **Nakit & Valör**, **Stopaj & Net Kazanç** ve **FIRE & Varlık Hedefi**.

---

## 🎯 Amiral Gemisi Özellikler & Modüller

### 1. 💱 Çoklu Para Birimi & Reel Değer Motoru (Multi-Currency Engine)
* **Desteklenen Birimler:** `[ ₺ TRY ] [ $ USD ] [ € EUR ] [ 🥇 Gram Altın ]`
* Portföy büyüklüğü, günlük kazanç ve varlık değerlerini anlık canlı kurlarla Dolar, Euro ve Fiziki Altın cinsinden hesaplar; reel satın alma gücünüzü gösterir.

### 2. ⚡ Stopaj & Net Getiri Optimizasyon Laboratuvarı (Tax & Net Yield Engine)
* 2026 güncel vergi mevzuatına tam uyumlu stopaj simülasyonu.
* **%0 Stopaj Kalkanı:** Hisse Senedi Yoğun Fonlar ve BIST payları için tam vergi muafiyeti takibi, brüt/net getiri kıyaslaması ve vergi avantajı tavsiyeleri.

### 3. 🔔 Akıllı Fiyat, K/Z & Eşik Alarm Motoru (Smart Alerts Engine)
* Canlı `canlidoviz.com` ve `haremaltin.com` WebSocket akışına entegre saliselik alarm denetimi.
* Hedef fiyat (`USD >= 48.50`, `Gram Altın >= 7000`), portföy günlük getiri eşikleri ve dip alım fırsatı alarmları.
* Web Audio API synthesized terminal uyarısı ve tarayıcı masaüstü bildirim desteği.

### 4. 🎯 Hedef Odaklı Varlık & FIRE Simülatörü (Goal-Based Wealth Builder)
* **Hazır Hedefler:** Ev Peşinatı, Finansal Özgürlük (FIRE), Yeni Araç ve Eğitim Fonu.
* Başlangıç varlığı, aylık düzenli ekleme, beklenen bileşik getiri (CAGR) ve enflasyon düzeltmesiyle hedefe ulaşma tarihi projeksiyonu ve interaktif grafik eğrisi.

### 5. 🖨️ Tek Tıkla Kurumsal Yatırımcı Bülteni & A4 PDF (Executive Memo Engine)
* Banka ve portföy yönetim şirketleri standartlarında, A4 yazdırmaya ve PDF kaydetmeye hazır tek sayfalık yönetici özeti.
* Çoklu para birimi özeti, varlık ağırlıkları tablosu, Quant risk metrikleri (Sharpe, Sortino, VaR, Beta) ve yasal bülten çıktısı.

### 6. ⏱️ Çoklu Borsa & Piyasa Seans Saatleri Hub'ı (Market Sessions Engine)
* **Borsa İstanbul (BIST 100/30):** 10:00 – 18:00
* **TEFAS Fon Piyasası (Takasbank & SPK):** 09:00 – 13:30 (Aynı Gün Valör) / 17:30 (İleri Valör)
* **Amerikan Borsaları (NYSE & NASDAQ / Midas):** 16:30 – 23:00 TSİ
* **Kapalıçarşı & Serbest Piyasa:** 09:00 – 18:00
* **Kripto Piyasaları:** 7/24 Kesintisiz

---

## 📁 Proje Mimarisi

```text
Zenith-Atlas/
├── 📄 index.html                           # Evrensel finans terminali arayüzü
├── 📄 sync.bat                             # Windows tek tık senkronizasyon aracı
├── 📄 requirements.txt                     # Python bağımlılıkları
├── 📄 .gitignore                           # Git kuralları
├── 📄 README.md                            # Proje dokümantasyonu
├── 📄 LICENSE                              # MIT Telif Lisansı
│
├── 📁 src/                                 # Kaynak kodlar ve modüller
│   ├── 📁 css/
│   │   └── 📄 styles.css                   # Zenith Atlas Design System
│   ├── 📁 js/
│   │   └── 📄 app.js                       # Finansal motorlar, WebSocket ve Quant analitiği
│   ├── 📁 data/                            # Veri katmanı
│   │   ├── 📄 funds_db.json                # 1.051 TEFAS Fonu Veritabanı
│   │   ├── 📄 funds_db.js                  # Çevrimdışı Fon Veritabanı
│   │   ├── 📄 markets.json                 # Canlı Piyasa & Kur Verileri
│   │   ├── 📄 markets.js                   # Çevrimdışı Piyasa Verileri
│   │   ├── 📄 prices.json                  # Portföy Fiyatları
│   │   └── 📄 prices.js                    # Çevrimdışı Fiyat Verileri
│   └── 📁 scripts/
│       └── 📄 sync.py                      # Python canlı WebSocket & veri senkronizasyon motoru
│
└── 📁 docs/
    └── 📄 portfolio-model.xlsx             # Portföy hesaplama tablosu
```

---

## 🛡️ Güvenlik & Veri Bütünlüğü

1. **Content Security Policy (CSP):** Sıkılaştırılmış ve yalnızca onaylı finans API kaynaklarına izin veren güvenlik mimarisi.
2. **Subresource Integrity (SRI) SHA-384:** CDN üzerinden yüklenen harici kütüphanelerin kriptografik doğrulaması.
3. **XSS Koruması (`Utils.escapeHtml`):** Tüm dinamik kullanıcı girdilerinin ve piyasa verilerinin sanitize edilmesi.
4. **Excel Formula Injection (DDE) Koruması:** Dışa aktarılan dosyalarda formül enjeksiyonu (`=`, `+`, `-`, `@`) önleme kalkanı.
5. **Atomik Dosya Yönetimi:** Geçici dosyalar üzerinden kesintisiz veri güncelleme.
6. **%100 Yerel Veri Gizliliği:** Tüm kullanıcı verileri yerel cihazda (`localStorage`) saklanır, sunucuya aktarılmaz.

---

## 👨‍💻 Geliştirici & İletişim

**Çağrı Giray Keşan**  
*Frontend-Heavy Full-Stack Engineer | AI Intern @ Microsoft*  
* 🐙 **GitHub:** [@Cagrik34](https://github.com/Cagrik34)  
* 💼 **LinkedIn:** [in/cagrigiraykesan](https://www.linkedin.com/in/cagrigiraykesan)  

---

## ⚠️ Yasal Bilgilendirme
Bu uygulama **yatırım tavsiyesi niteliği taşımaz.** Tüm piyasa verileri kamuya açık resmî platformlardan (TEFAS, Takasbank, Harem Altın, Bigpara, BIST) bilgilendirme ve analiz amacıyla sunulmaktadır.
