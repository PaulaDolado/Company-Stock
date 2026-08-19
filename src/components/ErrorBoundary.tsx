import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Evita que un error de render en una página tire toda la app en blanco.
 * Se coloca dentro del router, con `key` por ruta (ver AppRoutes), para
 * que navegar a otra página recupere el árbol automáticamente.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error no controlado en la interfaz:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" />
          </span>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-foreground">Algo ha ido mal</h1>
            <p className="text-sm text-muted-foreground">
              Se ha producido un error al mostrar esta página.
            </p>
          </div>
          <Button onClick={() => window.location.reload()}>Recargar la página</Button>
        </div>
      );
    }

    return this.props.children;
  }
}
