import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useParams } from 'react-router-dom';
import { RepoProvider, useRepo } from './contexts/RepoContext';
import NavBar from './components/NavBar';
import RepoSelector from './pages/RepoSelector';
import CommandCenter from './pages/CommandCenter';
import ArchitectureLab from './pages/ArchitectureLab';
import RequestLab from './pages/RequestLab';
import MemoryPalace from './pages/MemoryPalace';
import CodeWalk from './pages/CodeWalk';
import Panic from './pages/Panic';
import Stefan from './pages/Stefan';

function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-4">
      <p className="text-7xl font-bold text-gray-800 font-mono">404</p>
      <h1 className="text-2xl font-bold text-white">Page not found</h1>
      <p className="text-gray-500">This route doesn't exist in Repo OS.</p>
      <a href="/" className="inline-block mt-4 px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors">
        ← Back to Repo Selector
      </a>
    </div>
  );
}

function RepoLayout() {
  const { repoId } = useParams<{ repoId: string }>();
  const { setActiveRepo } = useRepo();

  useEffect(() => {
    if (repoId) {
      setActiveRepo(repoId);
    }
  }, [repoId, setActiveRepo]);

  return (
    <div className="min-h-screen bg-surface-950">
      <NavBar />
      <main>
        <Outlet />
      </main>
      <footer className="border-t border-gray-800 mt-16 py-6 text-center text-xs text-gray-700 font-mono">
        Repo OS — Red Planet Staffing CodeScreen — Local study tool
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <RepoProvider>
        <Routes>
          {/* RepoSelector — full screen, no NavBar */}
          <Route path="/" element={<RepoSelector />} />

          {/* Repo-scoped layout with NavBar */}
          <Route path="/:repoId" element={<RepoLayout />}>
            <Route index element={<CommandCenter />} />
            <Route path="architecture"  element={<ArchitectureLab />} />
            <Route path="request-lab"   element={<RequestLab />} />
            <Route path="memory-palace" element={<MemoryPalace />} />
            <Route path="code-walk"     element={<CodeWalk />} />
            <Route path="panic"         element={<Panic />} />
            <Route path="stefan"        element={<Stefan />} />
          </Route>

          {/* 404 fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </RepoProvider>
    </BrowserRouter>
  );
}
