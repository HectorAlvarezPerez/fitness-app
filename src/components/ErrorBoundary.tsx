import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    if (window.location.pathname === '/preview.html') {
      window.location.reload();
      return;
    }
    localStorage.clear();
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-white p-6 text-slate-900">
          <div className="max-w-md text-center">
            <div className="mb-5 flex justify-center text-amber-700">
              <span className="material-symbols-outlined text-5xl">warning</span>
            </div>
            <h1 className="mb-3 text-2xl font-bold">Algo salió mal</h1>
            <p className="mb-6 text-slate-600">
              La aplicación ha encontrado un error inesperado. Si el problema persiste, intenta
              cargar la vista de nuevo.
            </p>
            {this.state.error && (
              <div className="mb-6 max-h-48 overflow-auto rounded-lg border border-red-200 bg-red-50 p-3 text-left">
                <code className="whitespace-pre-wrap text-xs text-red-800">
                  {import.meta.env.DEV
                    ? this.state.error.stack || this.state.error.message
                    : this.state.error.message}
                </code>
              </div>
            )}
            <Button
              type="button"
              onClick={this.handleReset}
            >
              {window.location.pathname === '/preview.html' ? 'Recargar vista' : 'Reiniciar App'}
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
