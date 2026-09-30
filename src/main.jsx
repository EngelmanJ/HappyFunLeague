import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App.jsx";
import WeeklyDigest from "./WeeklyDigest.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/weekly" replace />} />
        <Route path="/history" element={<App />} />
        <Route path="/weekly" element={<WeeklyDigest />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
