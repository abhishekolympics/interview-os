import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import MissionControl from './pages/MissionControl';
import Overview from './pages/Overview';
import Architecture from './pages/Architecture';
import RequestFlow from './pages/RequestFlow';
import Flashcards from './pages/Flashcards';
import MemoryPalace from './pages/MemoryPalace';
import Stefan from './pages/Stefan';
import Panic from './pages/Panic';
import RequestLab from './pages/RequestLab';

function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-4">
      <p className="text-7xl font-bold text-gray-800 font-mono">404</p>
      <h1 className="text-2xl font-bold text-white">Page not found</h1>
      <p className="text-gray-500">This route doesn't exist in Interview OS.</p>
      <a href="/" className="inline-block mt-4 px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors">
        ← Back to Mission Control
      </a>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-surface-950">
        <NavBar />
        <main>
          <Routes>
            <Route path="/"               element={<MissionControl />} />
            <Route path="/overview"       element={<Overview />} />
            <Route path="/architecture"   element={<Architecture />} />
            <Route path="/request-flow"   element={<RequestFlow />} />
            <Route path="/flashcards"     element={<Flashcards />} />
            <Route path="/memory-palace"  element={<MemoryPalace />} />
            <Route path="/stefan"         element={<Stefan />} />
            <Route path="/panic"          element={<Panic />} />
            <Route path="/request-lab"    element={<RequestLab />} />
            <Route path="*"              element={<NotFound />} />
          </Routes>
        </main>
        <footer className="border-t border-gray-800 mt-16 py-6 text-center text-xs text-gray-700 font-mono">
          Interview OS — Red Planet Staffing CodeScreen — Local study tool
        </footer>
      </div>
    </BrowserRouter>
  );
}
