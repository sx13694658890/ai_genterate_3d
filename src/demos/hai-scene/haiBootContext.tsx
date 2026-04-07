import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export type HaiBootOverlayMode = "tap" | "busy" | "error";

export type HaiBootUiState = {
  showScene: boolean;
  bootMode: HaiBootOverlayMode;
  bootHint: string;
  bootError: string | null;
  genProgress: number | null;
};

const initialUi: HaiBootUiState = {
  showScene: false,
  bootMode: "tap",
  bootHint: "",
  bootError: null,
  genProgress: null,
};

type Handlers = { onStart: () => void; onRetry: () => void };

type HaiBootContextValue = {
  ui: HaiBootUiState;
  setUi: Dispatch<SetStateAction<HaiBootUiState>>;
  registerBootHandlers: (h: Handlers) => void;
  triggerStart: () => void;
  triggerRetry: () => void;
};

const HaiBootContext = createContext<HaiBootContextValue | null>(null);

export function HaiBootProvider({ children }: { children: ReactNode }) {
  const [ui, setUi] = useState<HaiBootUiState>(initialUi);
  const handlersRef = useRef<Handlers>({ onStart: () => {}, onRetry: () => {} });

  const registerBootHandlers = useCallback((h: Handlers) => {
    handlersRef.current = h;
  }, []);

  const triggerStart = useCallback(() => {
    handlersRef.current.onStart();
  }, []);

  const triggerRetry = useCallback(() => {
    handlersRef.current.onRetry();
  }, []);

  const value = useMemo(
    () => ({
      ui,
      setUi,
      registerBootHandlers,
      triggerStart,
      triggerRetry,
    }),
    [ui, registerBootHandlers, triggerStart, triggerRetry]
  );

  return <HaiBootContext.Provider value={value}>{children}</HaiBootContext.Provider>;
}

export function useHaiBoot(): HaiBootContextValue {
  const v = useContext(HaiBootContext);
  if (!v) throw new Error("useHaiBoot 必须在 HaiBootProvider 内使用");
  return v;
}
