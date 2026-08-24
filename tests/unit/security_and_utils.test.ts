import { describe, it, expect } from 'vitest';
import { sanitizeCsvCell, escapeHtml, formatTRY, formatPercent, formatNumber } from '../../src/utils/formatters';

describe('Security & Utility Suite', () => {
  describe('Excel DDE Formula Injection Defense (sanitizeCsvCell)', () => {
    it('prepends single quote to dangerous leading formula characters (=, +, -, @)', () => {
      expect(sanitizeCsvCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(sanitizeCsvCell('+cmd|/C calc!A0')).toBe("'+cmd|/C calc!A0");
      expect(sanitizeCsvCell('-1+1')).toBe("'-1+1");
      expect(sanitizeCsvCell('@HYPERLINK("http://evil.com")')).toBe("'@HYPERLINK(\"\"http://evil.com\"\")");
    });

    it('preserves regular strings and numbers safely', () => {
      expect(sanitizeCsvCell('TI3')).toBe('TI3');
      expect(sanitizeCsvCell('1250.50')).toBe('1250.50');
      expect(sanitizeCsvCell(null)).toBe('');
    });
  });

  describe('XSS HTML Escaping (escapeHtml)', () => {
    it('escapes dangerous HTML script and element tags', () => {
      const malicious = '<script>alert("xss")</script>&"\'';
      const safe = escapeHtml(malicious);
      expect(safe).not.toContain('<script>');
      expect(safe).toContain('&lt;script&gt;');
      expect(safe).toContain('&amp;');
      expect(safe).toContain('&quot;');
    });
  });

  describe('Financial Number Formatters', () => {
    it('formats Turkish Lira currency properly', () => {
      const formatted = formatTRY(12500.5);
      expect(formatted).toContain('12.500,50');
    });

    it('formats percentage with positive sign indicator', () => {
      expect(formatPercent(15.75)).toBe('+%15,75');
      expect(formatPercent(-4.2)).toBe('%-4,20');
    });
  });
});