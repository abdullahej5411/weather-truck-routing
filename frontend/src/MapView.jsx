import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Circle, Popup, Tooltip, useMap } from "react-leaflet";
import { COLORS, NAMES, ROUTE_COLORS, fmtDur, fmtTime } from "./lib";

function Fit({ routes }) {
  const map = useMap();
  useEffect(() => { map.fitBounds(routes.flatMap((r) => r.geometry), { padding: [50, 50] }); }, [routes, map]);
  return null;
}

export default function MapView({ res, route, onSelect, heat, hour }) {
  // Atmospheric weather corridor per checkpoint, colored by forecast risk `hour` hours after departure.
  const heatLayer = useMemo(() => !res || !heat ? null : res.routes.flatMap((r) => r.checkpoints.map((p, i) => (
    <Circle key={`${r.id}-${i}`} center={[p.lat, p.lon]} radius={res.interval_mi * 1300} interactive={false}
      pathOptions={{ className: "heat", stroke: false, fillColor: COLORS[p.forecast[hour]], fillOpacity: 0.40 }} />
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
      {route?.checkpoints.map((p) => {
        const currentLevel = (heat && p.forecast) ? p.forecast[hour] : p.level;
        const currentWx = (heat && p.forecast_weather) ? p.forecast_weather[hour] : [p.wind, p.rain, p.snow];
        const currentWind = currentWx ? currentWx[0] : p.wind;
        const currentRain = currentWx ? currentWx[1] : p.rain;
        const currentSnow = currentWx ? currentWx[2] : p.snow;
        const forecastTime = res?.departure ? fmtTime(new Date(res.departure).getTime() + hour * 36e5) : null;

        return (
          <CircleMarker
            key={p.mile}
            center={[p.lat, p.lon]}
            radius={8}
            pathOptions={{
              fillColor: COLORS[currentLevel],
              fillOpacity: 1,
              color: "#ffffff",
              weight: 2.5
            }}
          >
            <Popup>
              <div style={{ minWidth: '160px', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', gap: '8px' }}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>Mile {Math.round(p.mile)}</strong>
                  <span style={{
                    backgroundColor: COLORS[currentLevel],
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.68rem',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    {NAMES[currentLevel]}
                  </span>
                </div>
                {heat ? (
                  <>
                    <div style={{ fontSize: '0.78rem', color: '#1e40af', fontWeight: 600, marginBottom: '2px' }}>
                      Forecast: +{hour}h ({forecastTime})
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                      Wind <b>{currentWind}</b> mph • Rain <b>{currentRain}</b> in/h • Snow <b>{currentSnow}</b> in/h
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', borderTop: '1px solid #e2e8f0', paddingTop: '3px' }}>
                      Trip ETA: {fmtTime(p.eta)} ({p.level_name})
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '0.78rem', color: '#334155', marginBottom: '2px' }}>
                      ETA: <b>{fmtTime(p.eta)}</b>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                      Wind <b>{p.wind}</b> mph • Rain <b>{p.rain}</b> in/h • Snow <b>{p.snow}</b> in/h
                    </div>
                    {p.reasons?.length > 0 && (
                      <div style={{ fontSize: '0.7rem', color: '#b91c1c', marginTop: '4px' }}>
                        {p.reasons.join(', ')}
                      </div>
                    )}
                  </>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
      {res && [res.origin, res.destination].map((pt, i) => (
        <CircleMarker key={i} center={[pt.lat, pt.lon]} radius={9} pathOptions={{ fillColor: "#0a3a47", fillOpacity: 1, color: "#fff", weight: 3 }}>
          <Tooltip permanent direction="top">{i ? "End" : "Start"}</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
