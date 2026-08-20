import type { PortfolioFund } from '../types/portfolio';
import type { StressScenarioResult } from '../types/quant';

/**
 * 4 Boyutlu İnteraktif Sentetik Makro Şok ve Kriz Simülasyon Motoru
 * Şok Faktörleri:
 * 1. USD/TRY Sıçraması (+% / -%)
 * 2. TCMB Politika Faizi Şoku (Bps Artış/Azalış)
 * 3. BIST 100 Endeksi Şoku (+% / -%)
 * 4. Spot Ons Altın Şoku (+% / -%)
 */
export class SyntheticStressEngine {
  public static calculate(
    funds: PortfolioFund[],
    usdTryShockPct: number,
    tcmbRateShockBps: number,
    bistShockPct: number,
    goldShockPct: number,
    scenarioName: string = 'Özel Sentetik Makro Şok'
  ): StressScenarioResult {
    if (!funds || funds.length === 0) {
      return {
        scenarioName,
        usdTryShockPct,
        tcmbRateShockBps,
        bistShockPct,
        goldShockPct,
        portfolioLossPct: 0,
        portfolioLossTRY: 0,
        resilienceScore: 100,
        topDefensiveAsset: '-',
        hedgeRecommendations: []
      };
    }

    const totalValue = funds.reduce((sum, f) => sum + (f.shares * f.currentPrice), 0);
    let shockedPortfolioValue = 0;
    const assetDefensiveScores: Record<string, number> = {};

    funds.forEach(fund => {
      const fundVal = fund.shares * fund.currentPrice;
      let fundShockFactor = 0;

      const cat = fund.category;

      if (cat.includes('Hisse') || cat.includes('Hisse Senedi')) {
        fundShockFactor += (bistShockPct / 100.0) * 0.95;
        fundShockFactor -= (tcmbRateShockBps / 10000.0) * 0.60;
      } else if (cat.includes('Kıymetli Madenler') || fund.name.includes('Altın')) {
        fundShockFactor += (goldShockPct / 100.0) * 0.85;
        fundShockFactor += (usdTryShockPct / 100.0) * 0.90; // Gram altın = Ons * USD/TRY
      } else if (cat.includes('Yabancı') || fund.name.includes('Yabancı') || fund.name.includes('Teknoloji')) {
        fundShockFactor += (usdTryShockPct / 100.0) * 0.92;
        fundShockFactor += (bistShockPct / 100.0) * 0.15; // Küresel korelasyon
      } else if (cat.includes('Para Piyasası')) {
        fundShockFactor += (tcmbRateShockBps / 10000.0) * 0.85; // Faiz artışı para piyasasına yarar
      } else if (cat.includes('Borçlanma')) {
        fundShockFactor -= (tcmbRateShockBps / 10000.0) * 1.80; // Faiz artışı tahvil fiyatını düşürür (Duration riski)
      } else {
        // Değişken / Fon Sepeti
        fundShockFactor += (bistShockPct / 100.0) * 0.40;
        fundShockFactor += (usdTryShockPct / 100.0) * 0.35;
      }

      const shockedVal = fundVal * (1.0 + fundShockFactor);
      shockedPortfolioValue += Math.max(shockedVal, 0);
      assetDefensiveScores[fund.code] = (shockedVal - fundVal);
    });

    const portfolioDiffTRY = shockedPortfolioValue - totalValue;
    const portfolioLossPct = Number(((portfolioDiffTRY / totalValue) * 100).toFixed(2));
    const portfolioLossTRY = Number(portfolioDiffTRY.toFixed(2));

    // Dayanıklılık Skoru (0 - 100)
    const rawResilience = 100 + (portfolioLossPct * 2.0);
    const resilienceScore = Math.max(Math.min(Math.round(rawResilience), 100), 5);

    // En Güçlü Kalkan Varlık
    const bestAsset = Object.entries(assetDefensiveScores).sort((a, b) => b[1] - a[1])[0];
    const topDefensiveAsset = bestAsset ? `${bestAsset[0]} (${bestAsset[1] >= 0 ? '+' : ''}₺${Math.round(bestAsset[1]).toLocaleString('tr-TR')})` : '-';

    const hedgeRecommendations: string[] = [];
    if (portfolioLossPct < -10) {
      hedgeRecommendations.push('Döviz ve faiz duyarlılığını azaltmak için Para Piyasası veya Altın fonu ağırlığını artırın.');
    }
    if (bistShockPct < -15 && portfolioLossPct < -8) {
      hedgeRecommendations.push('Hisse yoğun fonlarda koruma sağlamak için düşük beta veya ters korelasyonlu enstrümanlar ekleyin.');
    }
    if (hedgeRecommendations.length === 0) {
      hedgeRecommendations.push('Portföy mevcut şok senaryosuna karşı yüksek kalkan ve çeşitlendirme sergilemektedir.');
    }

    return {
      scenarioName,
      usdTryShockPct,
      tcmbRateShockBps,
      bistShockPct,
      goldShockPct,
      portfolioLossPct,
      portfolioLossTRY,
      resilienceScore,
      topDefensiveAsset,
      hedgeRecommendations
    };
  }
}
