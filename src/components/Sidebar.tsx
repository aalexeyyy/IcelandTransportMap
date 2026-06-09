import { useState, useEffect, useCallback } from 'react';
import { ArrowUpDown, Search, Route, Bus, Info, X } from 'lucide-react';
import AutocompleteInput from './AutocompleteInput';
import RouteDetailPanel from './RouteDetailPanel';
import ThemeToggle from './ThemeToggle';
import {
  type BusStop, type BusRoute,
  cityRoutes, countryRoutes,
  findRoutesBetweenStops, getRoutesForStop,
} from '../data/transitData';

interface Props {
  page:         'city' | 'country';
  isDark:       boolean;
  onThemeToggle:() => void;
  /* controlled stop selections */
  startStop:    BusStop | null;
  endStop:      BusStop | null;
  onStartStop:  (s: BusStop | null) => void;
  onEndStop:    (s: BusStop | null) => void;
  /* route selection */
  activeRoute:  BusRoute | null;
  onRouteSelect:(r: BusRoute | null) => void;
  /* active (highlighted) stop */
  activeStop:   BusStop | null;
  /* fly to stop on map */
  onFlyTo:      (s: BusStop) => void;
  /* mobile open state */
  isOpen:       boolean;
  onClose:      () => void;
}

/* ── Quick-pick routes shown on welcome screen ── */
const QUICK_CITY: string[]    = ['1','2','3','4','5','6','7','8','11','12','13','14','15','16','17','18','19','21','22','23','24','25','26','28','29','30','31','35','36'];
const QUICK_COUNTRY: string[] = ['50','51','52','55','57','58','62','71','79','82','84','89','91','93'];

export default function Sidebar(props: Props) {
  const {
    page, isDark, onThemeToggle,
    startStop, endStop, onStartStop, onEndStop,
    activeRoute, onRouteSelect,
    activeStop, onFlyTo,
    isOpen, onClose,
  } = props;

  const [foundRoutes,  setFoundRoutes]  = useState<BusRoute[]>([]);
  const [showResults,  setShowResults]  = useState(false);

  /* recompute matching routes whenever start/end change */
  useEffect(() => {
    if (startStop && endStop) {
      const found = findRoutesBetweenStops(startStop.id, endStop.id, page);
      setFoundRoutes(found);
      setShowResults(true);
      if (found.length === 1) onRouteSelect(found[0]);
    } else {
      setFoundRoutes([]);
      setShowResults(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startStop, endStop, page]);

  const handleSwap = useCallback(() => {
    onStartStop(endStop);
    onEndStop(startStop);
  }, [startStop, endStop, onStartStop, onEndStop]);

  /* routes shown when a single stop is active and no search results shown */
  // Show stop routes when: activeStop exists AND either no search is active,
  // OR only one of start/end is set (user selected a stop in search but hasn't picked both yet)
  const stopRoutes: BusRoute[] = (activeStop && !showResults)
    ? getRoutesForStop(activeStop.id, page)
    : [];

  /* quick picks from correct page pool */
  const quickIds = page === 'city' ? QUICK_CITY : QUICK_COUNTRY;
  const pool     = page === 'city' ? cityRoutes : countryRoutes;
  const quickRoutes = quickIds.map(id => pool.find(r => r.id === id)).filter(Boolean) as BusRoute[];

  /* ── style constants ── */
  const bg      = isDark ? '#0d1117' : '#fff';
  const border  = isDark ? '#21262d' : '#f0f0f0';
  const txt     = isDark ? '#e2e8f0' : '#1a202c';
  const sub     = isDark ? '#8b949e' : '#6b7280';
  const card    = isDark ? '#161b22' : '#f8fafc';

  const sideStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, height: '100%', zIndex: 40,
    width: 330,
    display: 'flex', flexDirection: 'column',
    background: bg, borderRight: `1px solid ${border}`,
    boxShadow: '4px 0 30px rgba(0,0,0,.12)',
    transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
    transition: 'transform .3s ease',
    fontFamily: 'system-ui, sans-serif',
  };

  /* desktop: always visible */
  const mq = window.matchMedia('(min-width: 1024px)');
  if (mq.matches) sideStyle.transform = 'translateX(0)';

  return (
    <>
      {/* no backdrop — sidebar overlays without dimming the map */}

      <aside style={sideStyle}>

        {/* ── HEADER ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderBottom: `1px solid ${border}`, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: '#d32600',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 4px 12px rgba(211,38,0,.4)',
            }}>
              <Bus size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, color: txt, lineHeight: 1 }}>Strætó</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: sub,
                textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 2 }}>
                {page === 'city' ? 'Reykjavík · Capital Region' : 'Iceland · Countryside'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <ThemeToggle isDark={isDark} onToggle={onThemeToggle} />
            <button onClick={onClose} style={{
              width: 38, height: 38, alignItems: 'center', justifyContent: 'center',
              borderRadius: 10, border: `1.5px solid ${border}`, background: 'transparent',
              cursor: 'pointer', color: sub,
              display: mq.matches ? 'none' : 'flex',
            }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── MAIN BODY ── */}
        {activeRoute ? (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <RouteDetailPanel
              route={activeRoute}
              page={page}
              activeStopId={activeStop?.id}
              isDark={isDark}
              onClose={() => onRouteSelect(null)}
              startStop={startStop}
              endStop={endStop}
              onStopClick={stop => {
                onFlyTo(stop);
                onRouteSelect(activeRoute); // keep route highlighted
              }}
            />
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto' }}>

            {/* ── SEARCH PANEL ── */}
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${border}` }}>
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '.1em', color: sub,
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12,
              }}>
                <Search size={10} />Plan Journey
              </div>

              <AutocompleteInput
                value={startStop?.name ?? ''}
                page={page}
                onChange={s => { onStartStop(s); if (s) onFlyTo(s); }}
                placeholder="Search stop name…"
                label="From"
                accentHex="#d32600"
                isDark={isDark}
              />

              {/* swap */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
                <button
                  onClick={handleSwap}
                  disabled={!startStop && !endStop}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    border: `1.5px solid ${border}`, background: card,
                    cursor: 'pointer', color: sub,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all .2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#d32600'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = card; (e.currentTarget as HTMLElement).style.color = sub; }}
                >
                  <ArrowUpDown size={13} />
                </button>
              </div>

              <AutocompleteInput
                value={endStop?.name ?? ''}
                page={page}
                onChange={s => { onEndStop(s); if (s) onFlyTo(s); }}
                placeholder="Search stop name…"
                label="To"
                accentHex="#0a68b3"
                isDark={isDark}
              />
            </div>

            {/* ── ROUTE RESULTS ── */}
            {showResults && (
              <div style={{ padding: '14px 16px' }}>
                <SectionLabel icon={<Route size={10} />} isDark={isDark}
                  label={foundRoutes.length > 0
                    ? `${foundRoutes.length} route${foundRoutes.length > 1 ? 's' : ''} found`
                    : 'No direct routes'} />

                {foundRoutes.length === 0 ? (
                  <div style={{
                    background: isDark ? '#2d1f0e' : '#fffbeb', borderRadius: 10,
                    border: `1px solid ${isDark ? '#92400e55' : '#fcd34d'}`,
                    padding: '12px 14px',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#fcd34d' : '#92400e' }}>
                      No direct route between these stops.
                    </div>
                    <div style={{ fontSize: 12, color: isDark ? '#fbbf2499' : '#b45309', marginTop: 4 }}>
                      Try nearby stops or browse lines on the map.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {foundRoutes.map(r => {
                      const si = r.stops.findIndex(s => s.stopId === startStop?.id);
                      const ei = r.stops.findIndex(s => s.stopId === endStop?.id);
                      return (
                        <RouteCard
                          key={r.id} route={r} isDark={isDark}
                          sub={`${ei - si} stop${ei - si !== 1 ? 's' : ''} · ${r.long.split('<->').pop()?.trim() ?? ''}`}
                          onClick={() => onRouteSelect(r)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── STOP'S ROUTES ── */}
            {stopRoutes.length > 0 && !showResults && (
              <div style={{ padding: '14px 16px' }}>
                <SectionLabel icon={<Bus size={10} />} isDark={isDark}
                  label={`Lines at ${activeStop?.name}`} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stopRoutes.map(r => (
                    <RouteCard key={r.id} route={r} isDark={isDark}
                      sub={r.long} onClick={() => onRouteSelect(r)} />
                  ))}
                </div>
              </div>
            )}

            {/* ── WELCOME / QUICK PICKS ── */}
            {!showResults && stopRoutes.length === 0 && (
              <div style={{ padding: '14px 16px' }}>
                {/* tip */}
                <div style={{
                  background: isDark ? '#161b22' : '#eff6ff', borderRadius: 10,
                  border: `1px solid ${isDark ? '#30363d' : '#bfdbfe'}`,
                  padding: '12px 14px', marginBottom: 16,
                  display: 'flex', gap: 10,
                }}>
                  <Info size={14} color={isDark ? '#60a5fa' : '#3b82f6'} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700,
                      color: isDark ? '#e2e8f0' : '#1e40af', marginBottom: 4 }}>
                      How to use
                    </div>
                    <ul style={{ fontSize: 11, color: isDark ? '#8b949e' : '#4b5563',
                      margin: 0, paddingLeft: 14, lineHeight: 1.7 }}>
                      <li>Search above to plan a journey</li>
                      <li>Click a map pin to see its routes</li>
                      <li>Tap any quick-pick line below</li>
                      <li>Use clusters to zoom into stops</li>
                    </ul>
                  </div>
                </div>

                <SectionLabel icon={<Route size={10} />} isDark={isDark} label="Lines" />
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(54px, 1fr))',
                  gap: 7,
                }}>
                  {quickRoutes.map(r => {
                    const isCountry = !!r.isCountry;
                    return (
                      <button
                        key={r.id}
                        onClick={() => onRouteSelect(r)}
                        style={{
                          height: 44, borderRadius: 10,
                          background: isCountry ? (isDark ? '#1a1f27' : '#fff') : r.color,
                          color: isCountry ? r.color : '#fff',
                          border: isCountry ? `2px solid ${r.color}` : 'none',
                          cursor: 'pointer',
                          fontWeight: 900, fontSize: 13,
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center', gap: 1,
                          boxShadow: isCountry ? `0 3px 10px ${r.color}33` : `0 3px 10px ${r.color}55`,
                          transition: 'transform .15s, box-shadow .15s',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.transform = 'scale(1.06)';
                          (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 18px ${r.color}55`;
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                          (e.currentTarget as HTMLElement).style.boxShadow = isCountry ? `0 3px 10px ${r.color}33` : `0 3px 10px ${r.color}55`;
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 900, lineHeight: 1 }}>{r.short}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={{
          padding: '8px 16px', borderTop: `1px solid ${border}`,
          fontSize: 10, color: sub, textAlign: 'center', flexShrink: 0,
        }}>
          Data: Strætó bs · opendata.straeto.is
        </div>
      </aside>
    </>
  );
}

/* ── Small reusable sub-components ── */
function SectionLabel({ icon, label, isDark }: { icon: React.ReactNode; label: string; isDark: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em',
      color: isDark ? '#6b7280' : '#9ca3af',
    }}>
      {icon}{label}
    </div>
  );
}

function RouteCard({ route, isDark, sub, onClick }: {
  route: BusRoute; isDark: boolean; sub: string; onClick: () => void;
}) {
  const bg     = isDark ? '#161b22' : '#f8fafc';
  const border = isDark ? '#30363d' : '#e8eaf0';
  const txt    = isDark ? '#e2e8f0' : '#1a202c';
  const subCol = isDark ? '#8b949e' : '#787878';
  const isCountry = !!route.isCountry;
  const badgeBg   = isCountry ? (isDark ? '#1a1f27' : '#fff') : route.color;
  const badgeText = isCountry ? route.color : '#fff';

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px', borderRadius: 12, textAlign: 'left',
        background: bg, border: `1.5px solid ${border}`,
        cursor: 'pointer', transition: 'all .15s', width: '100%',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = route.color;
        (e.currentTarget as HTMLElement).style.boxShadow  = `0 0 0 3px ${route.color}22`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = border;
        (e.currentTarget as HTMLElement).style.boxShadow  = 'none';
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: badgeBg, flexShrink: 0,
        border: isCountry ? `3.5px solid ${route.color}` : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 12px ${route.color}33`,
      }}>
        <span style={{ color: badgeText, fontWeight: 900, fontSize: 14 }}>{route.short}</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: txt }}>Line {route.short}</div>
        <div style={{ fontSize: 11, color: subCol, marginTop: 2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
          {sub}
        </div>
      </div>
    </button>
  );
}
