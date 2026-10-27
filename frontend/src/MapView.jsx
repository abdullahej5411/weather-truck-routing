import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Circle, Popup, Tooltip, useMap } from "react-leaflet";
import { COLORS, ROUTE_COLORS, fmtTime } from "./lib";

function Fit({ routes }) {
  const map = useMap();
  useEffect(() => { map.fitBounds(routes.flatMap((r) => r.geometry), { padding: [50, 50] }); }, [routes, map]);
  return null;
}

export default function MapView({ res, route, onSelect, heat, hour }) {
  // Blurred circles per checkpoint, coloured by the forecast risk `hour` hours after departure.
  const heatLayer = useMemo(() => !res || !heat ? null : res.routes.flatMap((r) => r.checkpoints.map((p, i) => (
    <Circle key={`${r.id}-${i}`} center={[p.lat, p.lon]} radius={res.interval_mi * 1100} interactive={false}
      pathOptions={{ className: "heat", stroke: false, fillColor: COLORS[p.forecast[hour]], fillOpacity: 0.6 }} />
  ))), [res, heat, hour]);

  return (
    <MapContainer center={[39, -98]} zoom={4}>
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {res && <Fit routes={res.routes} />}
      {heatLayer}
      {res?.routes.map((r) => (
        <Polyline key={r.id} positions={r.geometry} eventHandlers={{ click: () => onSelect(r.id) }}
          pathOptions={{ color: ROUTE_COLORS[r.id], weight: r.id === route.id ? 7 : 4, opacity: r.id === route.id ? 0.95 : 0.5 }}>
          <Tooltip sticky>{r.label}</Tooltip>
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
