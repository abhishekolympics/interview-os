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
          </Routes>
        </main>
        <footer className="border-t border-gray-800 mt-16 py-6 text-center text-xs text-gray-700 font-mono">
          Interview OS — Red Planet Staffing CodeScreen — Local study tool
        </footer>
      </div>
    </BrowserRouter>
  );
}
