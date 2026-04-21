import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './ErrorBoundary.tsx'

console.log("✨ main.tsx がロードされています");

const root = document.getElementById('root');
console.log("📍 root element:", root);

if (!root) {
  console.error("❌ root 要素が見つかりません!");
} else {
  console.log("✅ root 要素が見つかりました");
  try {
    createRoot(root).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
    console.log("✅ React アプリケーションをレンダリングしました");
  } catch (error) {
    console.error("❌ レンダリング中にエラーが発生しました:", error);
  }
}
