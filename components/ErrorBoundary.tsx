import React, { Component, ErrorInfo, ReactNode } from 'react';

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
        localStorage.clear();
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0F1214] p-8 text-white font-display">
                    <div className="max-w-md text-center">
                        <div className="mb-6 flex justify-center text-primary">
                            <span className="material-symbols-outlined text-6xl">warning</span>
                        </div>
                        <h1 className="mb-4 text-2xl font-bold">Algo salió mal</h1>
                        <p className="mb-8 text-slate-400">
                            La aplicación ha encontrado un error inesperado. Si el problema persiste, intenta reiniciar la aplicación.
                        </p>
                        <div className="bg-red-900/30 p-4 rounded-xl mb-8 border border-red-500/30 text-left overflow-auto max-h-40">
                            <code className="text-xs text-red-200">{this.state.error?.message}</code>
                        </div>
                        <button
                            onClick={this.handleReset}
                            className="rounded-full bg-primary px-6 py-3 font-bold text-white transition-hover hover:bg-primary/80"
                        >
                            Reiniciar App (Borrar datos)
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
