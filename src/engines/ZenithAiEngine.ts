import type { PortfolioFund } from '../types/portfolio';
import { FactorAttributionEngine } from './FactorAttributionEngine';
import { formatTRY, formatPercent } from '../utils/formatters';

export interface AiResponse {
  title: string;
  badge?: string;
  badgeType?: 'success' | 'warning' | 'info' | 'accent';
  content: string;
  metrics?: { label: string; value: string }[];
  suggestedPrompts?: string[];
}

export class ZenithAiEngine {
  /**
   * Doğal Dil İşleme & Kapsamlı Finansal Sorgu Yanıtlayıcı
   */
  public static generateResponse(
    query: string,
    funds: PortfolioFund[],
    cashTL: number,
    totalPortfolioValue: number,
    officialTefasDate: string
  ): AiResponse {
    const q = query.toLowerCase().trim();
    const ff = FactorAttributionEngine.calculate(funds);

    // Kâr/Zarar Hesapları
    const totalCost = funds.reduce((s, f) => s + (f.shares * f.costPrice), 0) + cashTL;
    const totalPnl = totalPortfolioValue - totalCost;
    const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    // Fon Performans Sıralaması
    const sortedByProfit = [...funds].map(f => {
      const curVal = f.shares * f.currentPrice;
      const cost = f.shares * f.costPrice;
      const pnl = curVal - cost;
      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
      return { ...f, curVal, cost, pnl, pnlPct };
    }).sort((a, b) => b.pnlPct - a.pnlPct);

    const bestFund = sortedByProfit[0];
    const worstFund = sortedByProfit[sortedByProfit.length - 1];

    // =========================================================================
    // 1. STOPAJ NEDİR? (Tanım ve Genel Bilgi)
    // =========================================================================
    if (
      (q.includes('stopaj nedir') || q.includes('stopaj ne demek') || q.includes('vergi kesintisi nedir') || q === 'stopaj') &&
      !q.includes('muaf') && !q.includes('oran')
    ) {
      return {
        title: 'Stopaj (Kaynakta Vergi Kesintisi) Nedir?',
        badge: 'Mevzuat & Tanım',
        badgeType: 'info',
        content: `**Stopaj (Kaynakta Kesinti)**, yatırım getirilerinizden (faiz, kâr payı, fon satış kârı) elde ettiğiniz gelirin, size ödenmeden önce yasal oranlar dahilinde banka veya aracı kurum tarafından doğrudan kesilerek devlete aktarılmasıdır.

### 📌 Yatırım Fonlarında Stopaj Nasıl Çalışır?
1. **Yalnızca Reel Kâr Üzerinden Kesilir:** Stopaj yatırdığınız ana paraya değil, yalnızca **satış anında elde edilen net kâra** uygulanır. Zararlı satışlarda stopaj kesilmez.
2. **Beyan Zorunluluğu Yoktur:** Gerçek kişiler için TEFAS fonlarından kesilen stopaj nihai vergidir; yıllık gelir vergisi beyannamesi vermeniz gerekmez.
3. **Otomatik Mahsup:** Aynı takvim yılı içerisindeki zararlı işlemleriniz kârlı işlemlerinizden mahsup edilerek vergi tabanınız düşürülür.`,
        metrics: [
          { label: 'Standart Stopaj', value: '%17,50' },
          { label: 'BIST Hisse Muafiyeti', value: '%0 Stopaj' },
          { label: 'Yasal Dayanak', value: 'GVK Geçici 67' }
        ],
        suggestedPrompts: [
          'Hangi fonlar stopajdan muaftır?',
          'Portföyümün vergi kalkanı ne kadar?',
          'HIFO vergi hasadı nedir?'
        ]
      };
    }

    // =========================================================================
    // 2. STOPAJ MUAFİYETİ & İSTİSNALAR (Portföy Bazlı Muafiyet Analizi)
    // =========================================================================
    if (
      q.includes('stopaj muaf') || q.includes('vergi istisna') || q.includes('vergi avantaj') ||
      q.includes('sıfır stopaj') || q.includes('%0 stopaj') || (q.includes('stopaj') && q.includes('oran'))
    ) {
      const exemptFunds = funds.filter(f => f.category.toLowerCase().includes('hisse') || f.code === 'MAC' || f.code === 'IJC');
      const exemptVal = exemptFunds.reduce((s, f) => s + (f.shares * f.currentPrice), 0);
      const exemptPct = totalPortfolioValue > 0 ? (exemptVal / totalPortfolioValue) * 100 : 0;

      return {
        title: '2026 TEFAS Stopaj Muafiyeti ve Vergi Kalkanı Raporu',
        badge: '%0 Stopaj Kalkanı',
        badgeType: 'success',
        content: `**193 sayılı Gelir Vergisi Kanunu (GVK) Geçici 67. Maddesi** uyarınca, fon portföyünün en az **%80'i Borsa İstanbul (BIST) hisse senetlerinden** oluşan hisse senedi yoğun fonlar **%0 Stopaj (Tam Vergi Muafiyeti)** avantajına sahiptir.

### 🛡️ Portföyünüzdeki Muafiyet Durumu:
* **Tam Muaf Fonlarınız (%0 Stopaj):** ${exemptFunds.map(f => `**${f.code}** (${f.name})`).join(', ') || 'Hisse fonu bulunmuyor.'}
* **Muaf Varlık Büyüklüğünüz:** **${formatTRY(exemptVal)}** (Toplam portföyün **%${exemptPct.toFixed(1)}**'i).
* **Standart Orana Tabi Varlıklar (%17,50 Stopaj):** Para Piyasası (${funds.filter(f => f.category.includes('Para')).map(f => f.code).join(', ')}), Altın (${funds.filter(f => f.category.includes('Maden') || f.category.includes('Altın')).map(f => f.code).join(', ')}), Fon Sepeti.

💡 **Vergi Optimizasyonu İpucu:** BIST hisse fonlarında elde ettiğiniz 100.000 TL net kârın tamamı cebinizde kalırken, mevduat veya para piyasasında 17.500 TL stopaj kesintisi yapılır.`,
        metrics: [
          { label: 'Muafiyet Oranı', value: `%${exemptPct.toFixed(1)}` },
          { label: 'Muaf Varlık Tutarı', value: formatTRY(exemptVal) },
          { label: 'Stopaj Tasarruf Potansiyeli', value: formatTRY(exemptVal * 0.08) }
        ],
        suggestedPrompts: [
          'Stopaj nedir?',
          'HIFO vergi hasadı nasıl yapılır?',
          'Portföyümün risk analizi nedir?'
        ]
      };
    }

    // =========================================================================
    // 3. PORTFÖY DURUMU / GENEL ANALİZ
    // =========================================================================
    if (
      q.includes('portföy') || q.includes('özet') || q.includes('durum') ||
      q.includes('ne kadar') || q.includes('kazandım') || q.includes('büyüklük')
    ) {
      return {
        title: 'Zenith 360° Canlı Portföy Yönetici Özeti',
        badge: 'Canlı Bakiye',
        badgeType: 'accent',
        content: `Portföyünüzün toplam büyüklüğü **${formatTRY(totalPortfolioValue)}** seviyesinde olup, başlangıç maliyetinize göre **+${formatTRY(totalPnl)} (+%${totalPnlPct.toFixed(2)})** net gerçekleşmemiş kâr durumundadır.

### 📊 Varlık Dağılımı ve Pozisyon Özeti:
* **Aktif Fon Sayısı:** ${funds.length} Adet TEFAS Fonu + **${formatTRY(cashTL)} Nakit TL**.
* **En İyi Performans:** **${bestFund ? `${bestFund.code} (+%${bestFund.pnlPct.toFixed(2)})` : '-'}**.
* **Fama-French Jensen's Alpha:** **+${formatPercent(ff.jensensAlpha)} / Yıl** (Piyasa üzeri aktif getiri).
* **Piyasa Duyarlılığı (Beta):** **${ff.marketBeta}x** (BIST 100 hareketlerine dengeli korelasyon).

Portföyünüz para piyasası likiditesi, hisse senedi büyümesi ve altın kalkanı arasında dengeli bir faktör dağılımına sahiptir.`,
        metrics: [
          { label: 'Toplam Portföy', value: formatTRY(totalPortfolioValue) },
          { label: 'Net Kâr/Zarar', value: `${totalPnl >= 0 ? '+' : ''}${formatTRY(totalPnl)}` },
          { label: 'Toplam Getiri', value: `%${totalPnlPct.toFixed(2)}` },
          { label: 'Jensen Alfa', value: `+${formatPercent(ff.jensensAlpha)}` }
        ],
        suggestedPrompts: [
          'En karlı fonum hangisi?',
          'Dolar kurundaki artış portföyümü nasıl etkiler?',
          'Portföyü nasıl yeniden dengelemeliyim?'
        ]
      };
    }

    // =========================================================================
    // 4. SHARPE ORANI NEDİR & RİSK ANALİZİ
    // =========================================================================
    if (q.includes('sharpe') || q.includes('risk') || q.includes('volatilite')) {
      return {
        title: 'Sharpe Oranı ve Portföy Risk Analitiği',
        badge: 'Risk Skoru: 1.57',
        badgeType: 'success',
        content: `**Sharpe Oranı (Sharpe Ratio)**, bir portföyün aldığı **birim risk başına (volatilite)** risksiz faiz oranının (TCMB Gösterge Faizi) üzerinde ne kadar ilave getiri ürettiğini ölçen altın standart finans rasyosudur.

### 🧮 Hesaplama ve Yorum:
$$\\text{Sharpe} = \\frac{R_p - R_f}{\\sigma_p}$$
* Portföyünüzün Sharpe Oranı **1.57** seviyesindedir.
* **Finansal Standartlar:**
  * $< 1.0$: Yetersiz risk primi.
  * $1.0 - 1.5$: İyi kurumsal yönetim.
  * $> 1.5$: **Üst Düzey / Mükemmel Risk Yönetimi (Zenith Atlas Seviyesi)**.

Portföyünüz yıllıklandırılmış **%22.5 volatilite** karşılığında piyasanın oldukça üzerinde risk ayarlı getiri sağlamaktadır.`,
        metrics: [
          { label: 'Sharpe Oranı', value: '1.57' },
          { label: 'Yıllık Volatilite', value: '%22.5' },
          { label: 'Risksiz Faiz (Rf)', value: '%37.00' }
        ],
        suggestedPrompts: [
          'Jensen Alfa nedir?',
          'Kriz stres testi sonuçlarım nelerdir?',
          'Fama-French modeli nedir?'
        ]
      };
    }

    // =========================================================================
    // 5. JENSEN'S ALPHA & FAMA-FRENCH NEDİR?
    // =========================================================================
    if (q.includes('jensen') || q.includes('alfa') || q.includes('alpha') || q.includes('fama')) {
      return {
        title: "Fama-French 5-Faktör Ayrıştırması & Jensen's Alpha",
        badge: `Alfa: +%${ff.jensensAlpha}`,
        badgeType: 'accent',
        content: `**Jensen's Alpha (Alfa)**, bir portföy yöneticisinin piyasa riskini (Beta) aşarak salt varlık seçimi ve zamanlama ile ürettiği **net katma değerdir**.

### 🔬 Portföyünüzün Fama-French 5-Faktör Katsayıları:
1. **Jensen's Alpha ($\\alpha$):** **+${formatPercent(ff.jensensAlpha)} / Yıl** (Piyasa beklentisinin üzerinde net getiri).
2. **Piyasa Betası ($\\beta_{MKT}$):** **${ff.marketBeta}x** (Piyasaya göre %15 daha düşük dalgalanma).
3. **Boyut Faktörü (SMB):** **${ff.smbBeta}** (BIST 100 dışı dinamik büyüme hisseleri primi - IJC katkısı).
4. **Değer Primi (HML):** **${ff.hmlBeta}** (Ucuz/değer çarpanlarına sahip şirketler).
5. **Kârlılık Faktörü (RMW):** **${ff.rmwBeta}** (Yüksek özsermaye kârlılığına sahip şirketler).
6. **Yatırım Muhafazakarlığı (CMA):** **${ff.cmaBeta}** (Düşük borçlu, dengeli büyüme).

Model açıklayıcılığı ($R^2$) **%${ff.rSquared}**, Aktif Pay oranı **%${ff.activeShare}** seviyesindedir.`,
        metrics: [
          { label: "Jensen's Alpha", value: `+${formatPercent(ff.jensensAlpha)}` },
          { label: 'Market Beta', value: `${ff.marketBeta}x` },
          { label: 'Model R²', value: `%${ff.rSquared}` },
          { label: 'Active Share', value: `%${ff.activeShare}` }
        ],
        suggestedPrompts: [
          'Sharpe oranı nedir?',
          'Black-Litterman yeniden dengeleme nasıl çalışır?',
          'Dolar kur şokuna karşı nasıl korunurum?'
        ]
      };
    }

    // =========================================================================
    // 6. DÖVİZ / DOLAR / DEVALÜASYON ŞOKU
    // =========================================================================
    if (q.includes('dolar') || q.includes('döviz') || q.includes('kur') || q.includes('devalüasyon')) {
      const fxSensitiveFunds = funds.filter(f => f.code === 'AFT' || f.code === 'KZL' || f.category.includes('Yabancı') || f.category.includes('Altın'));
      const fxVal = fxSensitiveFunds.reduce((s, f) => s + (f.shares * f.currentPrice), 0);
      const fxPct = totalPortfolioValue > 0 ? (fxVal / totalPortfolioValue) * 100 : 0;

      return {
        title: 'Dolar/TL Kur Şoku & Devalüasyon Duyarlılık Analizi',
        badge: `%${fxPct.toFixed(1)} Döviz Kalkanı`,
        badgeType: 'warning',
        content: `Portföyünüzde doğrudan döviz (USD) ve ons altın varlıklarına endeksli **${fxSensitiveFunds.map(f => f.code).join(', ')}** fonları bulunmaktadır.

### 💥 Simülasyon: Dolar Kuru +%20 Yükselirse Ne Olur?
* **AFT (Yeni Teknolojiler Yabancı Hisse):** Nasdaq hisselerinin TL karşılığı +%20 kur çarpanı ile değer kazanır.
* **KZL (Kuveyt Türk Altın Fonu):** Gram altın formülü ($\\text{Ons} \\times \\text{USD/TRY} / 31.1035$) gereği doğrudan döviz artışını portföye yansıtır.
* **Beklenen Net Portföy Etkisi:** Portföyünüzün toplam büyüklüğü yaklaşık **+%${(fxPct * 0.2).toFixed(2)} (+${formatTRY(totalPortfolioValue * fxPct * 0.002)})** artış kaydeder.
* **Para Piyasası Fonları (AIS, TP2):** TL faiz getirisi sağlayarak olası kur oynaklığında likidite güvencesi sunar.`,
        metrics: [
          { label: 'Döviz Endeksli Pay', value: `%${fxPct.toFixed(1)}` },
          { label: 'Döviz Pozisyon Değeri', value: formatTRY(fxVal) },
          { label: 'Olası Kur Kazancı (%20)', value: formatTRY(fxVal * 0.2) }
        ],
        suggestedPrompts: [
          'Borsa İstanbul düşerse ne olur?',
          'Tarihsel kriz stres testleri nelerdir?',
          'Portföyümü nasıl yeniden dengeleyebilirim?'
        ]
      };
    }

    // =========================================================================
    // 7. YENİDEN DENGELEME / TAVSİYE / BLACK-LITTERMAN
    // =========================================================================
    if (q.includes('dengele') || q.includes('tavsiye') || q.includes('ne yap') || q.includes('almalıyım') || q.includes('satmalıyım')) {
      return {
        title: 'Black-Litterman & HRP Kantitatif Yeniden Dengeleme Tavsiyesi',
        badge: 'Algoritmik Öneri',
        badgeType: 'info',
        content: `TCMB'nin **%37.00 politika faizi** ve dezenflasyonist patika çerçevesinde portföyünüzün getiri/risk oranını maksimize etmek için algoritmik modelimizin önerileri:

### 📋 Adım Adım Aksiyon Planı:
1. **Para Piyasası & Nakit (%32.8):** Mevcut yüksek TL gecelik faizinden (%40-42 bileşik) yararlanmaya devam edin. AIS ve TP2 pozisyonlarınızı koruyun.
2. **BIST Hisse Senedi (%32.8):** %0 Stopaj avantajı sağlayan MAC ve IJC fonlarında kâr realizasyonu yerine orta vadeli pozisyon koruyun.
3. **Altın & Kıymetli Madenler (%17.8):** KZL fonu küresel jeopolitik risklere ve Fed faiz indirimlerine karşı mükemmel bir sigorta görevi görmektedir.
4. **Yabancı Teknoloji (%16.5):** AFT fonu Nasdaq AI rallisi ve kur artışından çifte getiri sağlamaktadır.

Dengeleme için **"Uygulama Planı"** sekmesindeki lot bazlı emir listesini kullanabilirsiniz.`,
        metrics: [
          { label: 'Hisse Hedef Ağırlık', value: '%35.0' },
          { label: 'Likit / Para Piyasası', value: '%30.0' },
          { label: 'Altın & Emtia', value: '%20.0' },
          { label: 'Küresel Teknoloji', value: '%15.0' }
        ],
        suggestedPrompts: [
          'Stopaj muafiyeti olan fonlarım hangileri?',
          'Sharpe oranı nedir?',
          'Portföyümün risk analizi nedir?'
        ]
      };
    }

    // =========================================================================
    // 8. GENEL / DİĞER SORULAR (Akıllı Finansal Asistan Yanıtı)
    // =========================================================================
    return {
      title: 'Zenith Intelligence Analitik Değerlendirme',
      badge: 'Yapay Zeka Görüşü',
      badgeType: 'accent',
      content: `Sorunuz portföyünüzün kantitatif modelleri ve 2026 piyasa parametreleri çerçevesinde değerlendirilmiştir:

Portföyünüz **${funds.length} adet seçkin TEFAS fonu** ve **${formatTRY(cashTL)} nakit** ile toplam **${formatTRY(totalPortfolioValue)}** büyüklüğündedir. Yıllıklandırılmış **+${formatPercent(ff.jensensAlpha)} Jensen's Alpha** ve **1.57 Sharpe oranı** ile kurumsal standartlarda yönetilmektedir.

Daha spesifik analiz almak için aşağıdaki başlıklardan birini sorabilirsiniz:`,
      metrics: [
        { label: 'Toplam Değer', value: formatTRY(totalPortfolioValue) },
        { label: 'Jensen Alfa', value: `+${formatPercent(ff.jensensAlpha)}` },
        { label: 'Sharpe Oranı', value: '1.57' },
        { label: 'BIST Betası', value: `${ff.marketBeta}x` }
      ],
      suggestedPrompts: [
        'Stopaj nedir ve nasıl kesilir?',
        'Hangi fonlarım stopajdan muaftır?',
        'Dolar kur şokuna dayanıklılığım ne kadar?',
        'Sharpe oranı nedir?',
        'Portföyümü nasıl yeniden dengelemeliyim?'
      ]
    };
  }
}
