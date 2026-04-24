import React, { type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    if (import.meta.env.DEV) {
      console.error("❌ ErrorBoundary が捕捉しました:", error);
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary componentDidCatch:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      const isDevelopment = import.meta.env.DEV;
      
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0d1117',
          color: '#e6edf3',
          padding: '20px',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
        }}>
          <h1 style={{ color: '#f85149', marginBottom: '20px' }}>❌ エラーが発生しました</h1>
          <p style={{ background: '#161b22', padding: '20px', borderRadius: '8px', border: '1px solid #f85149', maxWidth: '600px' }}>
            {isDevelopment ? (
              <>
                {this.state.error?.message || '不明なエラー'}<br/><br/>
                {this.state.error?.stack}
              </>
            ) : (
              <>
                申し訳ありません。予期しないエラーが発生しました。<br/>
                ページを更新して、もう一度お試しください。
              </>
            )}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
