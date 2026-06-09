import { useState, useEffect, useCallback } from 'react';
import { Menu, Navigation, X, Locate, ChevronDown } from 'lucide-react';
import BusMap  from './components/BusMap';
import Sidebar from './components/Sidebar';
import { type BusStop, type BusRoute, getRouteById, cityRoutes, countryRoutes } from './data/transitData';

/* ── Theme persistence ─────────────────────────────────────────────────── */
function initTheme(): boolean {
  try {
    const s = localStorage.getItem('straeto-theme');
    if (s) return s === 'dark';
  } catch {}
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/* ── Inject CSS vars for route badge colors in popups ─────────────────── */
function injectRouteColorVars() {
  const all = [...cityRoutes, ...countryRoutes];
  const vars = all.map(r => {
    const key = `--rc-${r.id.replace(/[^a-zA-Z0-9]/g, '-')}`;
    return `${key}: ${r.color};`;
  }).join('\n');
  let el = document.getElementById('straeto-route-vars');
  if (!el) {
    el = document.createElement('style');
    el.id = 'straeto-route-vars';
    document.head.appendChild(el);
  }
  el.textContent = `:root { ${vars} }`;
}

export default function App() {
  const [isDark,     setIsDark]     = useState(initTheme);
  const [page,       setPage]       = useState<'city' | 'country'>('city');
  const [sideOpen,   setSideOpen]   = useState(false);
  const [startStop,  setStartStop]  = useState<BusStop | null>(null);
  const [endStop,    setEndStop]    = useState<BusStop | null>(null);
  const [activeRoute,setActiveRoute]= useState<BusRoute | null>(null);
  const [activeStop, setActiveStop] = useState<BusStop | null>(null);
  // flyStop key increments to force re-fly even to same stop
  const [flyStop,    setFlyStop]    = useState<{ stop: BusStop; key: number } | null>(null);
  

  /* apply dark class */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try { localStorage.setItem('straeto-theme', isDark ? 'dark' : 'light'); } catch {}
  }, [isDark]);

  /* inject route CSS color variables once on mount */
  useEffect(() => { injectRouteColorVars(); }, []);

  /* ── Reset state on page switch ── */
  useEffect(() => {
    setStartStop(null);
    setEndStop(null);
    setActiveRoute(null);
    setActiveStop(null);
    setFlyStop(null);
  }, [page]);

  /* ── Window event listeners for popup buttons ── */
  useEffect(() => {
    const onStart = (e: Event) => {
      const stop = (e as CustomEvent<BusStop>).detail;
      setStartStop(stop);
      setActiveStop(stop);
      setSideOpen(true);
      // Do NOT fly — user is already looking at the stop
    };
    const onEnd = (e: Event) => {
      const stop = (e as CustomEvent<BusStop>).detail;
      setEndStop(stop);
      setActiveStop(stop);
      setSideOpen(true);
    };
    const onRoute = (e: Event) => {
      const routeId = (e as CustomEvent<string>).detail;
      const route = getRouteById(routeId, page);
      if (route) { setActiveRoute(route); setSideOpen(true); }
    };
    window.addEventListener('bs:start', onStart);
    window.addEventListener('bs:end',   onEnd);
    window.addEventListener('bs:route', onRoute);
    return () => {
      window.removeEventListener('bs:start', onStart);
      window.removeEventListener('bs:end',   onEnd);
      window.removeEventListener('bs:route', onRoute);
    };
  }, [page]);

  /* ── fly helper ── */
  const flyTo = useCallback((stop: BusStop) => {
    
    setFlyStop(prev => ({ stop, key: (prev?.key ?? 0) + 1 }));
  }, []);

  /* ── stop pin click (sidebar highlight only, sidebar stays as-is) ── */
  const handleStopOpen = useCallback((stop: BusStop) => {
    setActiveStop(stop);
    // intentionally NOT calling setSideOpen(true) — let user open sidebar themselves
  }, []);

  const bg = isDark ? '#0d1117' : '#f0efe9';

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: bg }}>

      {/* ── Map fills full screen ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <BusMap
          key={page}
          page={page}
          isDark={isDark}
          activeRoute={activeRoute}
          flyStop={flyStop}
          activeStopId={activeStop?.id ?? null}
          startStop={startStop}
          endStop={endStop}
          onStopOpen={handleStopOpen}
        />
      </div>

      {/* ── Sidebar ── */}
      <Sidebar
        page={page}
        isDark={isDark}
        onThemeToggle={() => setIsDark(d => !d)}
        startStop={startStop}
        endStop={endStop}
        onStartStop={setStartStop}
        onEndStop={setEndStop}
        activeRoute={activeRoute}
        onRouteSelect={setActiveRoute}
        activeStop={activeStop}
        onFlyTo={flyTo}
        isOpen={sideOpen}
        onClose={() => setSideOpen(false)}
      />

      {/* ── Top bar (mobile hamburger + page selector) ── */}
      <div style={{
        position: 'absolute', top: 12, left: 12, right: 12, zIndex: 20,
        display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none',
      }}>
        {/* hamburger (mobile) */}
        <button
          onClick={() => setSideOpen(true)}
          style={{
            pointerEvents: 'all', height: 42, paddingInline: 14,
            borderRadius: 14, border: `1.5px solid ${isDark ? '#30363d' : '#e2e8f0'}`,
            background: isDark ? '#161b22ee' : '#ffffffee',
            color: isDark ? '#e2e8f0' : '#1a202c',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 18px rgba(0,0,0,.12)', backdropFilter: 'blur(8px)',
          }}
        >
          <Menu size={15} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>
            {page === 'city' ? 'Reykjavík' : 'Iceland'}
          </span>
        </button>

        {/* ── PAGE SELECTOR DROPDOWN ── */}
        <div style={{ position: 'relative', pointerEvents: 'all' }}>
          <select
            value={page}
            onChange={e => setPage(e.target.value as 'city' | 'country')}
            style={{
              height: 42, paddingInline: '12px 32px',
              borderRadius: 14, border: `1.5px solid ${isDark ? '#30363d' : '#e2e8f0'}`,
              background: isDark ? '#161b22ee' : '#ffffffee',
              color: isDark ? '#e2e8f0' : '#1a202c',
              cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
              appearance: 'none', outline: 'none',
              boxShadow: '0 4px 18px rgba(0,0,0,.12)', backdropFilter: 'blur(8px)',
            }}
          >
            <option value="city">🏙️ Capital Region (City buses)</option>
            <option value="country">🗺️ Iceland (Countryside routes)</option>
          </select>
          <ChevronDown size={13} style={{
            position: 'absolute', right: 10, top: '50%',
            transform: 'translateY(-50%)', pointerEvents: 'none',
            color: isDark ? '#6b7280' : '#9ca3af',
          }} />
        </div>

        {/* active route badge */}
        {activeRoute && (
          <div
            style={{
              pointerEvents: 'all', height: 42, paddingInline: 14,
              borderRadius: 14, display: 'flex', alignItems: 'center', gap: 8,
              background: activeRoute.isCountry ? (isDark ? '#1a1f27ee' : '#ffffffee') : activeRoute.color,
              color: activeRoute.isCountry ? activeRoute.color : '#fff',
              border: activeRoute.isCountry ? `2px solid ${activeRoute.color}` : 'none',
              boxShadow: `0 4px 18px ${activeRoute.color}44`,
              backdropFilter: activeRoute.isCountry ? 'blur(8px)' : undefined,
            }}
          >
            <Navigation size={13} />
            <span style={{ fontSize: 13, fontWeight: 800 }}>Line {activeRoute.short}</span>
            <button
              onClick={() => setActiveRoute(null)}
              style={{
                width: 22, height: 22, borderRadius: 6,
                border: activeRoute.isCountry ? `1px solid ${activeRoute.color}55` : 'none',
                background: activeRoute.isCountry ? 'transparent' : 'rgba(255,255,255,.25)',
                color: activeRoute.isCountry ? activeRoute.color : '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={11} />
            </button>
          </div>
        )}
      </div>

      {/* ── Recenter button ── */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('bs:recenter'))}
        title="Recenter map"
        style={{
          position: 'absolute', bottom: 80, right: 14, zIndex: 20,
          width: 40, height: 40, borderRadius: 12,
          border: `1.5px solid ${isDark ? '#30363d' : '#e2e8f0'}`,
          background: isDark ? '#161b22ee' : '#ffffffee',
          color: isDark ? '#e2e8f0' : '#374151',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 18px rgba(0,0,0,.12)', backdropFilter: 'blur(8px)',
        }}
      >
        <Locate size={16} />
      </button>
    </div>
  );
}
