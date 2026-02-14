import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import PokemonWorld from './pages/PokemonWorld';

import DojoPage from './pages/DojoPage';
import TapTrading from './pages/TapTrading';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-[#0a0a0a] to-black text-white">
        <Routes>
          <Route path="/" element={<><Navbar /><LandingPage /></>} />
          <Route element={<Dashboard />}>
            <Route path="/tap-trading" element={<TapTrading />} />
            <Route path="/pokemon-world" element={<PokemonWorld />} />
            <Route path="/pokemon-world/:dojoName/:roomId" element={<DojoPage />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
