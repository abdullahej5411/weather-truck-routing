import { useDeferredValue, useState } from "react";
import { Alert, Box, Button, Chip, CssBaseline, FormControlLabel, LinearProgress, MenuItem, Paper, Slider, Stack, Switch, TextField, ThemeProvider, Typography, createTheme } from "@mui/material";
import CheckpointTable from "./CheckpointTable";
import MapView from "./MapView";
import RouteCard from "./RouteCard";
import { API, COLORS, NAMES, fmtTime, localInput } from "./lib";

const theme = createTheme({
  palette: { primary: { main: "#0a3a47" }, secondary: { main: "#f5b82e" } },
  shape: { borderRadius: 6 },
  typography: { fontFamily: '"Segoe UI", system-ui, sans-serif' },
});

export default function App() {
  const [f, setF] = useState({ origin: "", destination: "", departure: localInput(new Date(Date.now() + 36e5)), weight: 40000, interval: 25 });
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState(null);
  const [heat, setHeat] = useState(true);
  const [hour, setHour] = useState(0);
  const slowHour = useDeferredValue(hour); // keeps the slider responsive while the map repaints
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const route = res?.routes.find((r) => r.id === sel);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch(`${API}/api/plan`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: f.origin, destination: f.destination, departure: new Date(f.departure).toISOString(), weight_lb: +f.weight, interval_mi: +f.interval }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || j.detail || "Request failed.");
      setRes(j); setSel(j.recommended_id); setHour(0);
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "grid", height: { md: "100vh" }, gridTemplateColumns: { xs: "1fr", md: "420px 1fr" }, gridTemplateRows: { xs: "auto 75vh", md: "100%" } }}>
        <Box component="aside" sx={{ overflowY: "auto", p: 2.5, bgcolor: "grey.50", borderRight: 1, borderColor: "divider" }}>
          <Typography variant="h5" color="primary" fontWeight={700} gutterBottom>Weather-aware truck routing</Typography>
          <Stack component="form" onSubmit={submit} spacing={2}>
            <TextField required label="Origin" size="small" value={f.origin} onChange={set("origin")} placeholder="Dallas, TX" />
            <TextField required label="Destination" size="small" value={f.destination} onChange={set("destination")} placeholder="Denver, CO" />
            <TextField required label="Departure" size="small" type="datetime-local" value={f.departure} onChange={set("departure")} InputLabelProps={{ shrink: true }} />
            <Stack direction="row" spacing={2}>
              <TextField required label="Load weight (lb)" size="small" type="number" inputProps={{ min: 1, max: 150000 }} value={f.weight} onChange={set("weight")} />
              <TextField select label="Checkpoint every" size="small" value={f.interval} onChange={set("interval")} sx={{ minWidth: 130 }}>
                {[10, 25, 50].map((n) => <MenuItem key={n} value={n}>{n} miles</MenuItem>)}
              </TextField>
            </Stack>
            <Button type="submit" variant="contained" color="secondary" disabled={busy}>{busy ? "Analyzing routes…" : "Find safest route"}</Button>
            {busy && <LinearProgress />}
          </Stack>
          {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
          {res && (
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              {res.notice && <Alert severity="warning">{res.notice}</Alert>}
              <Alert severity="success" icon={false}>{res.explanation}</Alert>
              {res.routes.map((r) => <RouteCard key={r.id} r={r} selected={r.id === sel} onSelect={() => setSel(r.id)} />)}
              <CheckpointTable route={route} />
            </Stack>
          )}
        </Box>
        <Box sx={{ position: "relative", minHeight: 0 }}>
          <MapView res={res} route={route} onSelect={setSel} heat={heat} hour={slowHour} />
          {res && (
            <Paper elevation={4} sx={{ position: "absolute", zIndex: 1000, left: "50%", bottom: 24, transform: "translateX(-50%)", width: "min(680px, 92%)", px: 2, py: 1 }}>
              <Stack direction="row" spacing={3} alignItems="center">
                <FormControlLabel control={<Switch checked={heat} onChange={(e) => setHeat(e.target.checked)} />} label="Heatmap" />
                <Slider min={0} max={48} value={hour} onChange={(_, v) => setHour(v)} disabled={!heat} valueLabelDisplay="auto"
                  marks={[0, 12, 24, 36, 48].map((v) => ({ value: v, label: `+${v}h` }))} aria-label="Forecast hours after departure" />
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="caption" sx={{ mr: 1 }}>{fmtTime(new Date(res.departure).getTime() + hour * 36e5)}</Typography>
                {NAMES.map((n, i) => <Chip key={n} size="small" label={n} sx={{ bgcolor: COLORS[i], color: "#fff" }} />)}
              </Stack>
            </Paper>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
