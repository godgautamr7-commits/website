import { useEffect, useRef, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import Home from './pages/Home';
import Minecraft from './pages/Minecraft';
import Plans from './pages/Plans';
import PlanDetail from './pages/PlanDetail';
import { Login, Register } from './pages/Auth';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';
import { Contact, Status, Terms, Privacy } from './pages/Static';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!window.location.hash) window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname]);
  return null;
}

/* Slim top progress bar that animates on every route change */
function RouteProgress() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const timers = useRef([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setVisible(true);
    setProgress(12);
    timers.current.push(setTimeout(() => setProgress(48), 90));
    timers.current.push(setTimeout(() => setProgress(78), 240));
    timers.current.push(setTimeout(() => setProgress(100), 420));
    timers.current.push(setTimeout(() => setVisible(false), 700));
    timers.current.push(setTimeout(() => setProgress(0), 900));
    return () => timers.current.forEach(clearTimeout);
  }, [pathname]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px] transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-cyan-400 shadow-[0_0_12px_rgba(139,92,246,0.8)] transition-[width] duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

/* Re-mounts page content on navigation so the enter animation replays */
function AnimatedOutlet({ children }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}

export default function App() {
  return (
    <>
      <RouteProgress />
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<AnimatedOutlet><Home /></AnimatedOutlet>} />
          <Route path="/minecraft" element={<AnimatedOutlet><Minecraft /></AnimatedOutlet>} />
          <Route path="/plans" element={<AnimatedOutlet><Plans /></AnimatedOutlet>} />
          <Route path="/plans/:id" element={<AnimatedOutlet><PlanDetail /></AnimatedOutlet>} />
          <Route path="/login" element={<AnimatedOutlet><Login /></AnimatedOutlet>} />
          <Route path="/register" element={<AnimatedOutlet><Register /></AnimatedOutlet>} />
          <Route path="/contact" element={<AnimatedOutlet><Contact /></AnimatedOutlet>} />
          <Route path="/status" element={<AnimatedOutlet><Status /></AnimatedOutlet>} />
          <Route path="/terms" element={<AnimatedOutlet><Terms /></AnimatedOutlet>} />
          <Route path="/privacy" element={<AnimatedOutlet><Privacy /></AnimatedOutlet>} />
          <Route
            path="/checkout"
            element={<ProtectedRoute><AnimatedOutlet><Checkout /></AnimatedOutlet></ProtectedRoute>}
          />
          <Route
            path="/order-confirmation"
            element={<ProtectedRoute><AnimatedOutlet><OrderConfirmation /></AnimatedOutlet></ProtectedRoute>}
          />
          <Route
            path="/dashboard"
            element={<ProtectedRoute><AnimatedOutlet><Dashboard /></AnimatedOutlet></ProtectedRoute>}
          />
          <Route
            path="/dashboard/:tab"
            element={<ProtectedRoute><AnimatedOutlet><Dashboard /></AnimatedOutlet></ProtectedRoute>}
          />
          <Route
            path="/admin"
            element={<ProtectedRoute admin><AnimatedOutlet><Admin /></AnimatedOutlet></ProtectedRoute>}
          />
          <Route
            path="/admin/:section"
            element={<ProtectedRoute admin><AnimatedOutlet><Admin /></AnimatedOutlet></ProtectedRoute>}
          />
          <Route path="*" element={<AnimatedOutlet><NotFound /></AnimatedOutlet>} />
        </Route>
      </Routes>
    </>
  );
}
