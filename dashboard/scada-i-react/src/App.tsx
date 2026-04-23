import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
// import DeviceManager from './pages/DeviceManager';
// import Alerts from './pages/Alerts';

function App() {
  return (
    // Tailwind classes applied directly to the wrapper div
    <div className="bg-gray-50 p-4 md:p-8 max-w-8xl mx-auto min-h-screen">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Setup future routes here */}
          {/* <Route path="/device-manager" element={<DeviceManager />} /> */}
          {/* <Route path="/alerts" element={<Alerts />} /> */}
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;