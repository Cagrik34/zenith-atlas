import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('[Zenith Atlas Runtime Catch]', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleResetState = (): void => {
    try {
      localStorage.removeItem('zenith_atlas_portfolio_v2');
      localStorage.removeItem('zenith_atlas_active_account_id');
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#060913',
          color: '#F8FAFC',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#EF4444'
            }}>
              <AlertTriangle size={28} />
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 8px 0', color: '#F1F5F9' }}>
              Beklenmeyen Bir Hata Yakalandı
            </h2>
            
            <p style={{ fontSize: '0.85rem', color: '#94A3B8', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              Terminal oturumunuz güvenle izole edildi. Verileriniz yerel depolamada korunmaktadır.
            </p>

            {this.state.error && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'left',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                color: '#FCA5A5',
                marginBottom: '20px',
                maxHeight: '120px',
                overflowY: 'auto'
              }}>
                {this.state.error.toString()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={16} />
                <span>Yeniden Başlat</span>
              </button>

              <button
                onClick={this.handleResetState}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#CBD5E1',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={16} />
                <span>Güvenli Sıfırla</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
