import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import FlowBuilder from './pages/FlowBuilder';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/builder" element={<FlowBuilder />} />
      </Routes>
    </Router>
  );
}

export default App;
