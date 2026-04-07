/** React Router v7 future flags：消除控制台 opt-in 提示，类型与较旧 @types 对齐 */
export {};

declare module "react-router-dom" {
  interface BrowserRouterProps {
    future?: {
      v7_startTransition?: boolean;
      v7_relativeSplatPath?: boolean;
    };
  }
}
