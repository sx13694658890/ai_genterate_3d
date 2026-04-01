import { Navigate, Route, Routes } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/demo/example-basic" replace />} />
      <Route path="/demo/:demoId" element={<MainLayout />} />
      <Route path="*" element={<Navigate to="/demo/example-basic" replace />} />
    </Routes>
  );
}
