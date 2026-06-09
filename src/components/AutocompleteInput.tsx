import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, X, Search } from 'lucide-react';
import { type BusStop, searchStops } from '../data/transitData';

interface Props {
  value:       string;
  page:        'city' | 'country';
  onChange:    (stop: BusStop | null) => void;
  placeholder: string;
  label:       string;
  accentHex:   string;   // e.g. "#d32600"
  isDark:      boolean;
}

export default function AutocompleteInput({
  value, page, onChange, placeholder, label, accentHex, isDark
}: Props) {
  const [query, setQuery]           = useState(value);
  const [hits, setHits]             = useState<BusStop[]>([]);
  const [open, setOpen]             = useState(false);
  const [focused, setFocused]       = useState(false);
  const [hiIdx, setHiIdx]           = useState(-1);
  const inputRef                    = useRef<HTMLInputElement>(null);
  const dropRef                     = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  const search = useCallback((q: string) => {
    const res = searchStops(q, page);
    setHits(res);
    setOpen(res.length > 0 && q.length > 0);
    setHiIdx(-1);
  }, [page]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (!v) { onChange(null); setOpen(false); return; }
    search(v);
  };

  const pick = (stop: BusStop) => {
    setQuery(stop.name);
    setOpen(false);
    onChange(stop);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHiIdx(i => Math.min(i + 1, hits.length - 1)); }
    else if (e.key === 'ArrowUp')  { e.preventDefault(); setHiIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && hiIdx >= 0) { e.preventDefault(); pick(hits[hiIdx]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  const clear = () => { setQuery(''); setOpen(false); onChange(null); inputRef.current?.focus(); };

  /* close on outside click */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!dropRef.current?.contains(e.target as Node) && !inputRef.current?.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const border  = focused ? `2px solid ${accentHex}` : `2px solid ${isDark ? '#30363d' : '#e2e8f0'}`;
  const bg      = isDark ? '#161b22' : '#fff';
  const txtCol  = isDark ? '#e2e8f0' : '#1a202c';
  const phCol   = isDark ? '#4b5563' : '#9ca3af';
  const dropBg  = isDark ? '#1c2128' : '#fff';
  const rowHov  = isDark ? '#21262d' : '#f8fafc';
  const divider = isDark ? '#21262d' : '#f1f5f9';

  return (
    <div style={{ position: 'relative' }}>
      <label style={{
        display: 'block', fontSize: 10, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
        color: isDark ? '#6b7280' : '#9ca3af',
      }}>{label}</label>

      <div style={{
        display: 'flex', alignItems: 'center', borderRadius: 12,
        border, background: bg, transition: 'border .15s',
        boxShadow: focused ? `0 0 0 3px ${accentHex}22` : 'none',
      }}>
        <Search size={13} style={{ margin: '0 8px', flexShrink: 0, color: isDark ? '#6b7280' : '#9ca3af' }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKey}
          onFocus={() => { setFocused(true); if (query) search(query); }}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete="off" spellCheck={false}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            padding: '11px 0', fontSize: 13, color: txtCol,
          }}
        />
        {/* placeholder color via pseudo — handled inline via JS trick */}
        {!query && <style>{`input::placeholder{color:${phCol}}`}</style>}
        {query && (
          <button onMouseDown={e => { e.preventDefault(); clear(); }}
            style={{ padding: '0 10px', background: 'none', border: 'none', cursor: 'pointer',
              color: isDark ? '#6b7280' : '#9ca3af', display: 'flex', alignItems: 'center' }}>
            <X size={13} />
          </button>
        )}
      </div>

      {open && hits.length > 0 && (
        <div ref={dropRef} style={{
          position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 6, zIndex: 9999,
          background: dropBg, borderRadius: 12,
          boxShadow: '0 12px 40px rgba(0,0,0,.18)',
          border: `1.5px solid ${isDark ? '#30363d' : '#e2e8f0'}`,
          overflow: 'hidden', maxHeight: 280, overflowY: 'auto',
        }}>
          {hits.map((stop, i) => (
            <button
              key={stop.id}
              onMouseDown={e => { e.preventDefault(); pick(stop); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 14px', background: i === hiIdx ? rowHov : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                borderBottom: i < hits.length - 1 ? `1px solid ${divider}` : 'none',
                transition: 'background .1s',
              }}
              onMouseEnter={() => setHiIdx(i)}
            >
              <MapPin size={12} style={{ marginTop: 2, flexShrink: 0, color: isDark ? '#6b7280' : '#9ca3af' }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: txtCol,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {stop.name}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 3 }}>
                  {stop.routes.slice(0, 6).map(r => (
                    <span key={r} style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 6,
                      background: isDark ? '#30363d' : '#f1f5f9',
                      color: isDark ? '#e2e8f0' : '#374151',
                    }}>{r}</span>
                  ))}
                  {stop.routes.length > 6 && (
                    <span style={{ fontSize: 10, color: isDark ? '#6b7280' : '#9ca3af' }}>+{stop.routes.length - 6}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
