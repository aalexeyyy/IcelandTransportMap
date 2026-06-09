import { ArrowLeft, Clock, Bus, ChevronRight } from 'lucide-react';
import { type BusRoute, type BusStop, getStopById } from '../data/transitData';

interface Props {
  route:        BusRoute;
  page:         'city' | 'country';
  activeStopId?: string;
  isDark:       boolean;
  onClose:      () => void;
  onStopClick:  (stop: BusStop) => void;
  startStop?:   BusStop | null;
  endStop?:     BusStop | null;
}

export default function RouteDetailPanel({ route, page, activeStopId, isDark, onClose, onStopClick, startStop, endStop }: Props) {
  const bg      = isDark ? '#0d1117' : '#fff';
  const border  = isDark ? '#21262d' : '#f1f5f9';
  const txt     = isDark ? '#e2e8f0' : '#1a202c';
  const sub     = isDark ? '#8b949e' : '#6b7280';
  const hov     = isDark ? '#161b22' : '#f8fafc';
  const isCountry  = !!route.isCountry;
  const badgeBg    = isCountry ? (isDark ? '#2c2c2c' : '#d1d1d1') : route.color;
  const badgeText  = isCountry ? route.color : '#fff';

  const stops = route.stops;
  const totalStops = stops.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: bg }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderBottom: `1px solid ${border}`, flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8, border: `1.5px solid ${border}`, background: 'transparent',
          cursor: 'pointer', color: sub, flexShrink: 0,
        }}>
          <ArrowLeft size={15} />
        </button>

        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: badgeBg,
          border: isCountry ? `2.5px solid ${route.color}` : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 12px ${route.color}44`,
        }}>
          <span style={{ color: badgeText, fontWeight: 900, fontSize: 14 }}>{route.short}</span>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: txt }}>Line {route.short}</div>
          <div style={{ fontSize: 11, color: sub, whiteSpace: 'nowrap', overflow: 'hidden',
            textOverflow: 'ellipsis', maxWidth: 200 }}>{route.long}</div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{
        margin: '10px 14px', padding: '8px 12px', borderRadius: 10,
        background: `${route.color}14`, border: `1px solid ${route.color}33`,
        display: 'flex', gap: 20, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Bus size={12} color={route.color} />
          <span style={{ fontSize: 12, fontWeight: 700, color: route.color }}>{totalStops} stops</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={12} color={route.color} />
          <span style={{ fontSize: 12, fontWeight: 700, color: route.color }}>
            {page === 'city' ? `~${Math.round(totalStops * 1.8)} min` : 'Long-distance'}
          </span>
        </div>
      </div>

      {/* ── Stop timeline ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 16px' }}>
        {stops.map((rs, idx) => {
          const stop    = getStopById(rs.stopId, page);
          if (!stop) return null;
          const isFirst  = idx === 0;
          const isLast   = idx === stops.length - 1;
          const isActive = stop.id === activeStopId;
          const isStart  = !!startStop && stop.id === startStop.id;
          const isEnd    = !!endStop   && stop.id === endStop.id;

          /* ── colours for start/end highlight ── */
          const startColor = '#16a34a';
          const endColor   = '#0a68b3';
          const markerColor = isStart ? startColor : isEnd ? endColor : null;

          return (
            <button
              key={`${rs.stopId}-${idx}`}
              onClick={() => onStopClick(stop)}
              style={{
                width: '100%', display: 'flex', alignItems: 'stretch', gap: 0,
                background: isStart
                  ? `linear-gradient(90deg, ${startColor}18 0%, transparent 100%)`
                  : isEnd
                  ? `linear-gradient(90deg, ${endColor}18 0%, transparent 100%)`
                  : isActive
                  ? `${route.color}12`
                  : 'transparent',
                border: 'none', cursor: 'pointer', padding: '2px 6px 2px 0',
                borderRadius: 8, transition: 'background .12s', textAlign: 'left',
                outline: isStart
                  ? `1.5px solid ${startColor}44`
                  : isEnd
                  ? `1.5px solid ${endColor}44`
                  : 'none',
                outlineOffset: '-1px',
              }}
              onMouseEnter={e => {
                if (!isStart && !isEnd) {
                  (e.currentTarget as HTMLElement).style.background = isActive ? `${route.color}12` : hov;
                }
              }}
              onMouseLeave={e => {
                if (!isStart && !isEnd) {
                  (e.currentTarget as HTMLElement).style.background = isActive ? `${route.color}12` : 'transparent';
                }
              }}
            >
              {/* timeline column */}
              <div style={{
                width: 28, display: 'flex', flexDirection: 'column',
                alignItems: 'center', flexShrink: 0,
              }}>
                <div style={{
                  flex: 1, width: 2, minHeight: 8,
                  background: isFirst ? 'transparent' : route.color, opacity: .3,
                }} />
                <div style={{
                  width: isFirst || isLast || isStart || isEnd ? 14 : 11,
                  height: isFirst || isLast || isStart || isEnd ? 14 : 11,
                  borderRadius: '50%',
                  background: markerColor ?? route.color,
                  border: `2.5px solid ${isDark ? '#0d1117' : '#fff'}`,
                  flexShrink: 0,
                  boxShadow: isStart
                    ? `0 0 0 3px ${startColor}44`
                    : isEnd
                    ? `0 0 0 3px ${endColor}44`
                    : isActive
                    ? `0 0 0 3px ${route.color}44`
                    : 'none',
                  transform: (isStart || isEnd || isActive) ? 'scale(1.2)' : 'scale(1)',
                  transition: 'all .15s',
                }} />
                <div style={{
                  flex: 1, width: 2, minHeight: 8,
                  background: isLast ? 'transparent' : route.color, opacity: .3,
                }} />
              </div>

              {/* stop info */}
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 0', borderBottom: !isLast ? `1px solid ${border}` : 'none',
                minWidth: 0,
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: isFirst || isLast || isStart || isEnd || isActive ? 700 : 500,
                    color: isStart ? startColor : isEnd ? endColor : isActive ? route.color : txt,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200,
                  }}>
                    {stop.name}
                  </div>
                  {/* Priority: start/end labels > origin/terminal */}
                  {isStart && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: startColor,
                      textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 2,
                      display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>▶</span> Departure
                    </div>
                  )}
                  {isEnd && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: endColor,
                      textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 2,
                      display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>⚑</span> Destination
                    </div>
                  )}
                  {!isStart && !isEnd && (isFirst || isLast) && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: route.color,
                      textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 2 }}>
                      {isFirst ? 'Origin' : 'Terminal'}
                    </div>
                  )}
                </div>
                <ChevronRight size={12} color={isStart ? startColor : isEnd ? endColor : sub} style={{ flexShrink: 0 }} />
              </div>
            </button>
          );
        })}
      </div>

      <div style={{
        padding: '8px 16px', borderTop: `1px solid ${border}`,
        fontSize: 10, color: sub, textAlign: 'center', flexShrink: 0,
      }}>
        Tap a stop to locate it on the map
      </div>
    </div>
  );
}
