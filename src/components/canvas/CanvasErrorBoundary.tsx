import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { error: Error | null };

export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[CanvasErrorBoundary]", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full min-h-[320px] items-center justify-center rounded-lg border border-red-900/60 bg-red-950/40 px-4 text-center text-sm text-red-200">
            场景加载出错：{this.state.error.message}
          </div>
        )
      );
    }
    return this.props.children;
  }
}
