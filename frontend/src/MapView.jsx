import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Circle, Popup, Tooltip, useMap } from "react-leaflet";
import { COLORS, NAMES, ROUTE_COLORS, fmtDur, fmtTime, assessWeather } from "./lib";

function Fit({ routes }) {
  const map = useMap();
  useEffect(() => { map.fitBounds(routes.flatMap((r) => r.geometry), { padding: [50, 50] }); }, [routes, map]);
  return null;
}

export default function MapView({ res, route, onSelect, heat, hour }) {
  // Atmospheric weather corridor specifically along the active selected route (no cross-route overlap)
  const heatLayer = useMemo(() => {
    if (!res || !heat || !route) return null;
    return route.checkpoints.map((p, i) => {
      let lvl = (p.forecast && p.forecast[hour] !== undefined) ? p.forecast[hour] : p.level;
      if (p.forecast_weather && p.forecast_weather[hour]) {
        const assessed = assessWeather(p.forecast_weather[hour][0], p.forecast_weather[hour][1], p.forecast_weather[hour][2], route.weight || 40000);
        lvl = assessed.lvl;
      }
      return (
        <Circle
          key={`heat-${route.id}-${i}`}
          center={[p.lat, p.lon]}
          radius={res.interval_mi * 950}
          interactive={false}
          pathOptions={{
            className: "heat",
            stroke: false,
            fillColor: COLORS[lvl],
            fillOpacity: 0.38,
          }}
        />
      );
    });
  }, [res, route, heat, hour]);

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
        let currentLevel = p.level;
        let currentWind = p.wind;
        let currentRain = p.rain;
        let currentSnow = p.snow;
        let currentReasons = p.reasons || [];

        if (heat && p.forecast_weather && p.forecast_weather[hour]) {
          const [w_wind, w_rain, w_snow] = p.forecast_weather[hour];
          const assessed = assessWeather(w_wind, w_rain, w_snow, route.weight || 40000);
          currentLevel = assessed.lvl;
          currentWind = w_wind;
          currentRain = w_rain;
          currentSnow = w_snow;
          currentReasons = assessed.reasons;
        } else if (heat && p.forecast && p.forecast[hour] !== undefined) {
          const assessed = assessWeather(p.wind, p.rain, p.snow, route.weight || 40000);
          currentLevel = assessed.lvl;
          currentWind = p.wind;
          currentRain = p.rain;
          currentSnow = p.snow;
          currentReasons = assessed.reasons;
        } else {
          const assessed = assessWeather(p.wind, p.rain, p.snow, route.weight || 40000);
          currentLevel = assessed.lvl;
          currentReasons = assessed.reasons;
        }

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
                    {currentReasons?.length > 0 && (
                      <div style={{ fontSize: '0.72rem', color: '#b91c1c', marginTop: '3px', fontWeight: 600 }}>
                        {currentReasons.join(', ')}
                      </div>
                    )}
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
