import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import {
  type BusStop, type BusRoute,
  cityStops, countryStops,
  cityRoutes, countryRoutes,
} from '../data/transitData';

/* ── Build a map of routeId → isCountry for popup badges ─────────────── */
const allRoutesMap = new Map<string, boolean>([
  ...cityRoutes.map(r => [r.id, false] as [string, boolean]),
  ...countryRoutes.map(r => [r.id, true] as [string, boolean]),
]);

/* ── Tile layers ─────────────────────────────────────────────────────────── */
const TILES = {
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
  },
};

const PAGE_CENTERS: Record<'city' | 'country', [number, number]> = {
  city:    [64.1380, -21.9428],
  country: [64.90,  -18.90],
};
const PAGE_ZOOMS: Record<'city' | 'country', number> = {
  city: 13,
  country: 6,
};

/* ── Popup HTML builder ─────────────────────────────────────────────────── */
function buildPopup(stop: BusStop, allRoutes: Map<string, boolean>): string {
  const badges = stop.routes.map(r => {
    const isCountry = allRoutes.get(r) ?? false;
    const colorStyle = isCountry
      ? `background:transparent;border:2px solid var(--rc-${r.replace(/[^a-zA-Z0-9]/g,'-')},#555);color:var(--rc-${r.replace(/[^a-zA-Z0-9]/g,'-')},#555);`
      : `background:var(--rc-${r.replace(/[^a-zA-Z0-9]/g,'-')},#555);color:#fff;border:none;`;
    return `<span onclick="window.__bs.route('${r}')" style="
      display:inline-block;padding:3px 9px;border-radius:8px;font-size:11px;
      font-weight:800;${colorStyle}
      margin:2px 2px 2px 0;cursor:pointer;transition:opacity .15s;
    " onmouseover="this.style.opacity=.75" onmouseout="this.style.opacity=1">${r}</span>`;
  }).join('');

  return `
  <div style="min-width:220px;max-width:270px;font-family:system-ui,sans-serif;border-radius:14px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#d32600 0%,#a31c00 100%);padding:12px 16px 10px;">
      <div style="font-size:14px;font-weight:800;color:#fff;line-height:1.25;">${stop.name}</div>
      <div style="font-size:10px;color:rgba(255,255,255,.7);margin-top:2px;text-transform:uppercase;letter-spacing:.06em;">Bus Stop · ID ${stop.id}</div>
    </div>
    <div style="padding:11px 14px;background:#fff;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:5px;">Lines served</div>
      <div style="margin-bottom:11px;">${badges}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;">
        <button onclick="window.__bs.start('${stop.id}')" style="
          padding:9px 4px;border-radius:9px;border:none;cursor:pointer;
          background:#d32600;color:#fff;font-size:12px;font-weight:700;font-family:inherit;">
          📍 From here
        </button>
        <button onclick="window.__bs.end('${stop.id}')" style="
          padding:9px 4px;border-radius:9px;border:none;cursor:pointer;
          background:#0a68b3;color:#fff;font-size:12px;font-weight:700;font-family:inherit;">
          🏁 To here
        </button>
      </div>
    </div>
  </div>`;
}

/* ── Stop icon factory ──────────────────────────────────────────────────── */ 
function makeIcon(highlight: boolean, active: boolean): L.DivIcon {
  const sz  = active ? 18 : highlight ? 14 : 9;
  const bg  = active ? '#ff0000' : highlight ? '#09ba00' : '#1e6ab5'; //Colors of the stops
  const brd = active ? '#fff' : '#fff';
  const pulse = active ? 'position:relative;' : '';
  return L.divIcon({
    className: '',
    html: `<div style="${pulse}width:${sz}px;height:${sz}px;background:${bg};
      border:2.5px solid ${brd};border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,.35);transition:all .2s;"></div>`,
    iconSize:   [sz, sz],
    iconAnchor: [sz / 2, sz / 2],
    popupAnchor:[0, -(sz / 2 + 4)],
  });
}

/* ── Drop-pin icon for start / end stops ────────────────────────────────── */
function makePinIcon(type: 'start' | 'end'): L.DivIcon {
  const isStart = type === 'start';
  const color   = isStart ? '#16a34a' : '#0a68b3';
  const shadow  = isStart ? '#16a34a44' : '#0a68b344';

  // Inner SVG icon: play-arrow for start, flag-checkered for end
  const iconSvg = isStart
    ? `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
        <polygon points="4,2 14,8 4,14" fill="white"/>
       </svg>`
    : `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
        <rect x="2" y="1" width="3" height="3" fill="white"/><rect x="5" y="1" width="3" height="3" fill="rgba(255,255,255,.4)"/>
        <rect x="8" y="1" width="3" height="3" fill="white"/><rect x="2" y="4" width="3" height="3" fill="rgba(255,255,255,.4)"/>
        <rect x="5" y="4" width="3" height="3" fill="white"/><rect x="8" y="4" width="3" height="3" fill="rgba(255,255,255,.4)"/>
        <line x1="2" y1="1" x2="2" y2="15" stroke="white" stroke-width="2" stroke-linecap="round"/>
       </svg>`;

  const html = `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
      <div style="
        width:36px;height:36px;border-radius:50% 50% 50% 4px;
        background:${color};
        border:3px solid #fff;
        box-shadow:0 4px 16px ${shadow},0 2px 6px rgba(0,0,0,.3);
        display:flex;align-items:center;justify-content:center;
        transform:rotate(-45deg);
      ">
        <div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;">
          ${iconSvg}
        </div>
      </div>
    </div>`;

  return L.divIcon({
    className: '',
    html,
    iconSize:   [36, 36],
    iconAnchor: [18, 36],
    popupAnchor:[0, -38],
  });
}
interface Props {
  page:         'city' | 'country';
  isDark:       boolean;
  activeRoute:  BusRoute | null;
  flyStop:      { stop: BusStop; key: number } | null;
  activeStopId: string | null;
  startStop:    BusStop | null;
  endStop:      BusStop | null;
  onStopOpen:   (stop: BusStop) => void;
  onPopupClose: () => void;
}

export default function BusMap({ page, isDark, activeRoute, flyStop, activeStopId, startStop, endStop, onStopOpen, onPopupClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const tileRef      = useRef<L.TileLayer | null>(null);
  const clusterRef   = useRef<L.MarkerClusterGroup | null>(null);
  const highlightLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef   = useRef<Map<string, L.Marker>>(new Map());
  const routeLayers  = useRef<L.Layer[]>([]);
  const startPinRef  = useRef<L.Marker | null>(null);
  const endPinRef    = useRef<L.Marker | null>(null);
  // Track whether a popup close was programmatic (opening another popup) vs user-initiated (X button)
  const suppressPopupClose = useRef(false);

  /* ── Initialise map (once per mount) ─────────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const center = PAGE_CENTERS[page];
    const zoom   = PAGE_ZOOMS[page];

    const map = L.map(containerRef.current, {
      center, zoom,
      zoomControl:       false,
      attributionControl: false,
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

    const tile = L.tileLayer(TILES.light.url, { attribution: TILES.light.attr, maxZoom: 19 });
    tile.addTo(map);
    tileRef.current = tile;
    mapRef.current  = map;
    highlightLayerRef.current = L.layerGroup().addTo(map);

    /* ── Cluster group ── */
    const lg = L as unknown as { markerClusterGroup: (o: unknown) => L.MarkerClusterGroup };
    const cg = lg.markerClusterGroup({
      maxClusterRadius:     48,
      spiderfyOnMaxZoom:    true,
      showCoverageOnHover:  false,
      zoomToBoundsOnClick:  true,
      disableClusteringAtZoom: 14,
      animate:              true,
      iconCreateFunction: (cluster: L.MarkerCluster) => {
        const n  = cluster.getChildCount();
        const sz = n < 10 ? 34 : n < 50 ? 42 : 50;
        const cl = n < 10 ? '#00a754' : n < 50 ? '#d32600' : '#0a68b3';
        return L.divIcon({
          html: `<div style="width:${sz}px;height:${sz}px;background:${cl}22;
            border:2px solid ${cl};border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 3px 12px rgba(0,0,0,.18);">
            <span style="color:${cl};font-size:${sz < 40 ? 11 : 13}px;font-weight:800;">${n}</span>
          </div>`,
          className: '',
          iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2],
        });
      },
    });

    /* ── Add stops ── */
    const stops = page === 'city' ? cityStops : countryStops;
    stops.forEach(stop => {
      const m = L.marker([stop.lat, stop.lng], { icon: makeIcon(false, false) });
      m.on('click', () => {
        onStopOpen(stop);
        suppressPopupClose.current = true;  // closing old popup to open new one
        map.closePopup();
        suppressPopupClose.current = false;
        L.popup({ closeButton: true, maxWidth: 290, offset: [0, -4], className: '' })
          .setLatLng([stop.lat, stop.lng])
          .setContent(buildPopup(stop, allRoutesMap))
          .openOn(map);
      });
      cg.addLayer(m);
      markersRef.current.set(stop.id, m);
    });
    map.addLayer(cg);
    clusterRef.current = cg;

    /* ── Global popup callback bindings ── */
    // These are set on the window so popup HTML can call them
    // We use a stable proxy that reads the current ref values
    (window as unknown as Record<string, unknown>).__bs = {
      start: (stopId: string) => {
        const s = (page === 'city' ? cityStops : countryStops).find(x => x.id === stopId);
        if (s) {
          suppressPopupClose.current = true;
          map.closePopup();
          suppressPopupClose.current = false;
          window.dispatchEvent(new CustomEvent('bs:start', { detail: s }));
        }
      },
      end: (stopId: string) => {
        const s = (page === 'city' ? cityStops : countryStops).find(x => x.id === stopId);
        if (s) {
          suppressPopupClose.current = true;
          map.closePopup();
          suppressPopupClose.current = false;
          window.dispatchEvent(new CustomEvent('bs:end', { detail: s }));
        }
      },
      route: (routeId: string) => {
        window.dispatchEvent(new CustomEvent('bs:route', { detail: routeId }));
      },
    };

    /* ── Recenter listener ── */
    const onRecenter = () => map.flyTo(center, zoom, { duration: 0.9 });
    window.addEventListener('bs:recenter', onRecenter);

    /* ── Popup close listener — deselect stop when popup is dismissed by user ── */
    const onPopupCloseEvt = () => {
      if (!suppressPopupClose.current) {
        window.dispatchEvent(new CustomEvent('bs:popupclose'));
      }
    };
    map.on('popupclose', onPopupCloseEvt);

    return () => {
      window.removeEventListener('bs:recenter', onRecenter);
      map.off('popupclose', onPopupCloseEvt);
      startPinRef.current?.remove();
      endPinRef.current?.remove();
      map.remove();
      mapRef.current = null;
      highlightLayerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Dark mode tile swap ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!mapRef.current || !tileRef.current) return;
    tileRef.current.remove();
    const t = isDark ? TILES.dark : TILES.light;
    tileRef.current = L.tileLayer(t.url, { attribution: t.attr, maxZoom: 19 }).addTo(mapRef.current!);
  }, [isDark]);

  /* ── Fly to stop + open popup ────────────────────────────────────────── */
  useEffect(() => {
    if (!flyStop || !mapRef.current) return;
    const map  = mapRef.current;
    const stop = flyStop.stop;
    map.flyTo([stop.lat, stop.lng], page === 'city' ? 16 : 11, { duration: 1.1 });

    const t = setTimeout(() => {
      if (!mapRef.current) return;
      suppressPopupClose.current = true;
      L.popup({ closeButton: true, maxWidth: 290, offset: [0, -4] })
        .setLatLng([stop.lat, stop.lng])
        .setContent(buildPopup(stop, allRoutesMap))
        .openOn(map);
      suppressPopupClose.current = false;
    }, 1250);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyStop]);

  /* ── Draw / clear route polyline ─────────────────────────────────────── */
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clear previous
    routeLayers.current.forEach(l => l.remove());
    routeLayers.current = [];

    // Reset all marker icons
    markersRef.current.forEach(m => m.setIcon(makeIcon(false, false)));

    if (!activeRoute) return;

    /* shape polyline */
    if (activeRoute.shape.length >= 2) {
      const color = activeRoute.color;
      const glow = L.polyline(activeRoute.shape as [number, number][], {
        color, weight: 14, opacity: 0.10, lineCap: 'round', lineJoin: 'round',
      }).addTo(map);
      const main = L.polyline(activeRoute.shape as [number, number][], {
        color, weight: 5,  opacity: 0.92, lineCap: 'round', lineJoin: 'round',
      }).addTo(map);
      const dot = L.polyline(activeRoute.shape as [number, number][], {
        color: 'rgba(255,255,255,.55)', weight: 2, dashArray: '1 16', lineCap: 'round',
      }).addTo(map);
      routeLayers.current = [glow, main, dot];

      map.flyToBounds(L.latLngBounds(activeRoute.shape as [number, number][]).pad(0.08), {
        duration: 0.9, maxZoom: page === 'city' ? 15 : 10,
      });
    }

    /* Highlight route stops */
    activeRoute.stops.forEach(rs => {
      const m = markersRef.current.get(rs.stopId);
      if (m) { m.setIcon(makeIcon(true, rs.stopId === activeStopId)); m.setZIndexOffset(500); }
    });
  }, [activeRoute, activeStopId, page]);

  /* ── Highlight active stop ───────────────────────────────────────────── */
  useEffect(() => {
    markersRef.current.forEach((m, id) => {
      const onRoute = activeRoute?.stops.some(s => s.stopId === id) ?? false;
      const shouldFloatAboveClusters = onRoute || id === activeStopId;

      if (highlightLayerRef.current && clusterRef.current) {
        const inHighlightLayer = highlightLayerRef.current.hasLayer(m);
        if (shouldFloatAboveClusters && !inHighlightLayer) {
          clusterRef.current.removeLayer(m);
          highlightLayerRef.current.addLayer(m);
        } else if (!shouldFloatAboveClusters && inHighlightLayer) {
          highlightLayerRef.current.removeLayer(m);
          clusterRef.current.addLayer(m);
        }
      }

      m.setIcon(makeIcon(onRoute, id === activeStopId));
      m.setZIndexOffset(id === activeStopId ? 9999 : onRoute ? 500 : 0);
    });
  }, [activeStopId, activeRoute]);

  /* ── Start pin marker ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (!mapRef.current) return;
    // Remove old
    if (startPinRef.current) { startPinRef.current.remove(); startPinRef.current = null; }
    if (!startStop) return;
    const pin = L.marker([startStop.lat, startStop.lng], {
      icon: makePinIcon('start'),
      zIndexOffset: 10000,
    }).addTo(mapRef.current);
    pin.bindTooltip(`<b>Start:</b> ${startStop.name}`, { direction: 'top', offset: [0, -40] });
    startPinRef.current = pin;
  }, [startStop]);

  /* ── End pin marker ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!mapRef.current) return;
    if (endPinRef.current) { endPinRef.current.remove(); endPinRef.current = null; }
    if (!endStop) return;
    const pin = L.marker([endStop.lat, endStop.lng], {
      icon: makePinIcon('end'),
      zIndexOffset: 10000,
    }).addTo(mapRef.current);
    pin.bindTooltip(`<b>End:</b> ${endStop.name}`, { direction: 'top', offset: [0, -40] });
    endPinRef.current = pin;
  }, [endStop]);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
}
