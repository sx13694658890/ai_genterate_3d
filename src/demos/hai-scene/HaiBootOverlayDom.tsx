import { useHaiBoot } from "./haiBootContext";

/** 画布外的纯 DOM 覆盖层，字号与布局不受 R3F / drei Html 缩放影响。 */
export function HaiBootOverlayDom() {
  const { ui, triggerStart, triggerRetry } = useHaiBoot();

  if (ui.showScene) return null;

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-neutral-950/85 p-4 text-center text-sm text-neutral-300"
      role="dialog"
      aria-modal="true"
      aria-label="加载与开始"
    >
      {ui.bootMode === "tap" ? (
        <>
          <p className="max-w-xs leading-relaxed">
            浏览器需用户点击后才能播放音频。配乐在后台线程合成，不阻塞界面。
          </p>
          <button
            type="button"
            onClick={triggerStart}
            className="rounded-md bg-neutral-200 px-5 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
          >
            开始
          </button>
        </>
      ) : null}

      {ui.bootMode === "busy" ? (
        <>
          <p className="max-w-xs text-neutral-400">{ui.bootHint || "加载中…"}</p>
          {ui.genProgress !== null ? (
            <div className="w-56 max-w-full">
              <div className="mb-1 text-xs text-neutral-500">
                {Math.round(ui.genProgress * 100)}%
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full bg-neutral-400 transition-[width] duration-150"
                  style={{ width: `${Math.round(ui.genProgress * 100)}%` }}
                />
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {ui.bootMode === "error" ? (
        <>
          <p className="max-w-xs text-red-400">{ui.bootError ?? "出错"}</p>
          <button
            type="button"
            onClick={triggerRetry}
            className="rounded-md border border-neutral-600 px-4 py-2 text-neutral-200 hover:bg-neutral-800"
          >
            重试
          </button>
        </>
      ) : null}
    </div>
  );
}
