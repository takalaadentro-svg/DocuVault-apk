import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('DocuVault Uncaught UI Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%',
          height: '100vh',
          backgroundColor: '#0F2444',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          color: '#F8FAFC',
          fontFamily: "'Inter', sans-serif",
          textAlign: 'center',
        }}>
          <div style={{
            maxWidth: 420,
            padding: 28,
            borderRadius: 20,
            backgroundColor: '#132B52',
            border: '1px solid #1E3A6D',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <AlertTriangle size={26} color="#EF4444" />
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F8FAFC' }}>
              DocuVault Session Interrupted
            </h2>

            <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.5 }}>
              A temporary display exception occurred while loading vault views. Your encrypted data remains safe.
            </p>

            {this.state.error && (
              <div style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                backgroundColor: 'rgba(0,0,0,0.3)',
                fontSize: 11,
                color: '#EF4444',
                fontFamily: 'monospace',
                textAlign: 'left',
                overflowX: 'auto',
                maxHeight: 100,
              }}>
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{
                marginTop: 8,
                padding: '10px 20px',
                borderRadius: 10,
                backgroundColor: '#0D9488',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <RotateCcw size={15} />
              <span>Reload DocuVault</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
