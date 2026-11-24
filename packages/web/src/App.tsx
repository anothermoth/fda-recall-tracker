import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout.tsx";
import { RecallDetailPage } from "./pages/RecallDetailPage.tsx";
import { RecallListPage } from "./pages/RecallListPage.tsx";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<RecallListPage />} />
        <Route path="recall/:recallNumber" element={<RecallDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
