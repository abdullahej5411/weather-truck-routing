import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Circle, Popup, Tooltip, useMap } from "react-leaflet";
import { COLORS, ROUTE_COLORS, fmtDur, fmtTime } from "./lib";

function Fit({ routes }) {
  const map = useMap();
  useEffect(() => { map.fitBounds(routes.flatMap((r) => r.geometry), { padding: [50, 50] }); }, [routes, map]);
  return null;
}

export default function MapView({ res, route, onSelect, heat, hour }) {
  // Soft atmospheric weather corridor per checkpoint, colored by forecast risk `hour` hours after departure.
  const heatLayer = useMemo(() => !res || !heat ? null : res.routes.flatMap((r) => r.checkpoints.map((p, i) => (
    <Circle key={`${r.id}-${i}`} center={[p.lat, p.lon]} radius={res.interval_mi * 1350} interactive={false}
      pathOptions={{ className: "heat", stroke: false, fillColor: COLORS[p.forecast[hour]], fillOpacity: 0.22 }} />
  ))), [res, heat, hour]);

  return (
    <MapContainer center={[39, -98]} zoom={4}>
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {res && <Fit routes={res.routes} />}
      {heatLayer}
      {res?.routes.map((r) => (
        <Polyline key={r.id} positions={r.geometry} eventHandlers={{ click: () => onSelect(r.id) }}
          pathOptions={{ color: ROUTE_COLORS[r.id], weight: r.id === route.id ? 7 : 4, opacity: r.id === route.id ? 0.95 : 0.5 }}>
          <Tooltip sticky className="google-route-tooltip">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', padding: '2px 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: ROUTE_COLORS[r.id],
                  display: 'inline-block'
                }} />
                <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>{r.label}</strong>
                {r.recommended && (
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#1e40af',
                    backgroundColor: '#dbeafe',
                    padding: '1px 6px',
                    borderRadius: '4px'
                  }}>
                    Recommended
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#1e293b', fontWeight: 600 }}>
                {fmtDur(r.duration_h)} • {Math.round(r.distance_mi)} mi ({Math.round(r.distance_mi * 1.60934)} km)
              </div>
              {r.summary?.avg_risk !== undefined && (
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  Avg weather risk: {r.summary.avg_risk} / 4
                </div>
              )}
            </div>
          </Tooltip>
        </Polyline>
      ))}
      {route?.checkpoints.map((p) => (
        <CircleMarker key={p.mile} center={[p.lat, p.lon]} radius={7} pathOptions={{ fillColor: COLORS[p.level], fillOpacity: 1, color: "#fff", weight: 2 }}>
          <Popup>
            <b>Mile {Math.round(p.mile)}, {p.level_name}</b><br />
            ETA {fmtTime(p.eta)}<br />
            Wind {p.wind} mph, rain {p.rain} in/hr, snow {p.snow} in/hr
            {p.reasons.map((x) => <div key={x}>{x}</div>)}
          </Popup>
        </CircleMarker>
      ))}
      {res && [res.origin, res.destination].map((pt, i) => (
        <CircleMarker key={i} center={[pt.lat, pt.lon]} radius={9} pathOptions={{ fillColor: "#0a3a47", fillOpacity: 1, color: "#fff", weight: 3 }}>
          <Tooltip permanent direction="top">{i ? "End" : "Start"}</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
