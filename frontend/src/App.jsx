import { useDeferredValue, useState } from "react";
import {
  Alert, Box, Button, Chip, CssBaseline, Divider,
  FormControlLabel, LinearProgress, MenuItem, Paper,
  Slider, Stack, Switch, TextField, ThemeProvider,
  Typography, createTheme,
} from "@mui/material";
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
  const [f, setF] = useState({
    origin: "",
    destination: "",
    departure: localInput(new Date(Date.now() + 36e5)),
    weight: 40000,
    interval: 25,
  });
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState(null);
  const [heat, setHeat] = useState(true);
  const [hour, setHour] = useState(0);
  const slowHour = useDeferredValue(hour);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const route = res?.routes.find((r) => r.id === sel);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await fetch(`${API}/api/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: f.origin,
          destination: f.destination,
          departure: new Date(f.departure).toISOString(),
          weight_lb: +f.weight,
          interval_mi: +f.interval,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || j.detail || "Request failed.");
      setRes(j);
      setSel(j.recommended_id);
      setHour(0);
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: "grid",
          height: { md: "100vh" },
          gridTemplateColumns: { xs: "1fr", md: "400px 1fr" },
          gridTemplateRows: { xs: "auto 60vh", md: "100%" },
          overflow: { md: "hidden" },
        }}
      >
        {/* --- Sidebar --- */}
        <Box
          component="aside"
          sx={{
            overflowY: "auto",
            p: { xs: 2, md: 2.5 },
            bgcolor: "grey.50",
            borderRight: { md: 1 },
            borderBottom: { xs: 1, md: 0 },
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" color="primary" fontWeight={700} gutterBottom>
            Weather-Aware Truck Routing
          </Typography>

          <Stack component="form" onSubmit={submit} spacing={2}>
            <TextField required fullWidth size="small" label="Origin" value={f.origin} onChange={set("origin")} placeholder="Dallas, TX" />
            <TextField required fullWidth size="small" label="Destination" value={f.destination} onChange={set("destination")} placeholder="Denver, CO" />
            <TextField required fullWidth size="small" label="Departure" type="datetime-local" value={f.departure} onChange={set("departure")} InputLabelProps={{ shrink: true }} />
            <Stack direction="row" spacing={1.5}>
              <TextField required size="small" type="number" label="Load weight (lb)" inputProps={{ min: 1, max: 150000 }} value={f.weight} onChange={set("weight")} sx={{ flex: 1 }} />
              <TextField select size="small" label="Interval" value={f.interval} onChange={set("interval")} sx={{ flex: 1 }}>
                {[10, 25, 50].map((n) => (<MenuItem key={n} value={n}>{n} mi</MenuItem>))}
              </TextField>
            </Stack>
            <Button type="submit" variant="contained" color="secondary" disabled={busy} fullWidth>
              {busy ? "Analyzing routes..." : "Find Safest Route"}
            </Button>
            {busy && <LinearProgress />}
          </Stack>

          {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}

          {res && (
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              {res.notice && <Alert severity="warning">{res.notice}</Alert>}
              <Alert severity="success" icon={false} sx={{ fontSize: "0.82rem" }}>{res.explanation}</Alert>
              {res.routes.map((r) => (
                <RouteCard key={r.id} r={r} selected={r.id === sel} onSelect={() => setSel(r.id)} />
              ))}
              {route && <CheckpointTable route={route} />}
            </Stack>
          )}
        </Box>

        {/* --- Map pane --- */}
        <Box sx={{ position: "relative", minHeight: 0, overflow: "hidden" }}>
          <MapView res={res} route={route} onSelect={setSel} heat={heat} hour={slowHour} />

          {/* --- Heatmap control panel --- */}
          {res && (
            <Paper
              elevation={6}
              sx={{
                position: "absolute",
                zIndex: 1000,
                left: "50%",
                bottom: { xs: 10, md: 20 },
                transform: "translateX(-50%)",
                width: { xs: "96%", sm: "min(580px, 92%)" },
                px: { xs: 1.5, sm: 2 },
                py: 1.5,
                borderRadius: 2,
              }}
            >
              {/* Row 1: Heatmap toggle + slider with +0h / +48h flanking labels */}
              <Stack direction="row" alignItems="center" spacing={1}>
                <FormControlLabel
                  sx={{ m: 0, flexShrink: 0 }}
                  control={<Switch size="small" checked={heat} onChange={(e) => setHeat(e.target.checked)} />}
                  label={<Typography variant="body2" fontWeight={600} sx={{ whiteSpace: "nowrap" }}>Heatmap</Typography>}
                />
                <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>+0h</Typography>
                <Slider
                  min={0} max={48}
                  value={hour}
                  onChange={(_, v) => setHour(v)}
                  disabled={!heat}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => `+${v}h`}
                  sx={{ flex: 1 }}
                  aria-label="Forecast hours after departure"
                />
                <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>+48h</Typography>
              </Stack>

              <Divider sx={{ my: 1 }} />

              {/* Row 2: Timestamp + risk legend chips — fully separated */}
              <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.75}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                  {fmtTime(new Date(res.departure).getTime() + hour * 36e5)}
                </Typography>
                {NAMES.map((n, i) => (
                  <Chip key={n} size="small" label={n} sx={{ bgcolor: COLORS[i], color: "#fff", fontWeight: 600, fontSize: "0.7rem" }} />
                ))}
              </Stack>
            </Paper>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
