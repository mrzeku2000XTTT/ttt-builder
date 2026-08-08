import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import TTTBuilderPage from "@/pages/TTTBuilder";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TTTBuilderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
