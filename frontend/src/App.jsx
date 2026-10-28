import { useDeferredValue, useState } from 'react';
import {
  Alert, Box, Button, Chip, CssBaseline, Divider,
  FormControlLabel, LinearProgress, MenuItem, Paper,
  Slider, Stack, Switch, TextField, ThemeProvider,
  Typography, createTheme,
} from '@mui/material';
import CheckpointTable from './CheckpointTable';
import MapView from './MapView';
import RouteCard from './RouteCard';
import { API, COLORS, NAMES, fmtTime, localInput } from './lib';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#3b82f6' },
    secondary: { main: '#f5b82e' },
    background: { default: '#0b1120', paper: '#111827' },
    text: { primary: '#f0f4ff', secondary: '#7c8db5' },
    divider: 'rgba(255,255,255,0.07)',
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Inter","Segoe UI",system-ui,sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        containedSecondary: {
          background: 'linear-gradient(135deg,#f5b82e 0%,#f97316 100%)',
          color: '#0b1120',
          fontWeight: 700,
          fontSize: '0.875rem',
          letterSpacing: '0.2px',
          '&:hover': {
            background: 'linear-gradient(135deg,#fbbf24 0%,#fb923c 100%)',
            transform: 'translateY(-1px)',
            boxShadow: '0 6px 20px rgba(245,184,46,0.35)',
          },
          '&.Mui-disabled': {
            background: 'rgba(245,184,46,0.2)',
            color: 'rgba(11,17,32,0.45)',
          },
          transition: 'all 0.2s ease',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
          '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
          backgroundColor: 'rgba(255,255,255,0.03)',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { color: '#7c8db5', '&.Mui-focused': { color: '#3b82f6' } } },
    },
    MuiSelect: {
      styleOverrides: { icon: { color: '#7c8db5' } },
    },
    MuiSlider: {
      styleOverrides: {
        root: { color: '#f5b82e', padding: '10px 0' },
        thumb: { '&:hover,&.Mui-focusVisible': { boxShadow: '0 0 0 8px rgba(245,184,46,0.15)' } },
        rail: { opacity: 0.25 },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': { color: '#f5b82e' },
          '&.Mui-checked + .MuiSwitch-track': { backgroundColor: '#f5b82e' },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { backgroundColor: 'rgba(59,130,246,0.15)', borderRadius: 4, height: 3 },
        bar: { backgroundColor: '#3b82f6', borderRadius: 4 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { backgroundColor: '#111827', backgroundImage: 'none', transition: 'all 0.2s ease' },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 6, fontWeight: 600 } },
    },
    MuiAlert: {
      styleOverrides: {
        standardSuccess: {
          backgroundColor: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.18)',
          color: '#86efac',
          '& .MuiAlert-icon': { color: '#22c55e' },
        },
        standardWarning: {
          backgroundColor: 'rgba(245,184,46,0.08)',
          border: '1px solid rgba(245,184,46,0.18)',
          color: '#fde68a',
          '& .MuiAlert-icon': { color: '#f5b82e' },
        },
        standardError: {
          backgroundColor: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.18)',
          color: '#fca5a5',
          '& .MuiAlert-icon': { color: '#ef4444' },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: 'rgba(255,255,255,0.05)', padding: '8px 10px' },
        head: {
          backgroundColor: '#0b1120',
          color: '#7c8db5',
          fontWeight: 600,
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
        },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiDivider: { styleOverrides: { root: { borderColor: 'rgba(255,255,255,0.07)' } } },
    MuiMenuItem: {
      styleOverrides: {
        root: { '&:hover': { backgroundColor: 'rgba(59,130,246,0.1)' } },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { backgroundColor: '#1a2540', border: '1px solid rgba(255,255,255,0.1)' },
      },
    },
  },
});

export default function App() {
  const [f, setF] = useState({
    origin: '',
    destination: '',
    departure: localInput(new Date(Date.now() + 36e5)),
    weight: 40000,
    interval: 'auto',
  });
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sel, setSel] = useState(null);
  const [heat, setHeat] = useState(true);
  const [hour, setHour] = useState(0);
  const slowHour = useDeferredValue(hour);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const route = res?.routes.find((r) => r.id === sel);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const r = await fetch(`${API}/api/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: f.origin,
          destination: f.destination,
          departure: new Date(f.departure).toISOString(),
          weight_lb: +f.weight,
          interval_mi: f.interval === 'auto' ? 'auto' : +f.interval,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || j.detail || 'Request failed.');
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
          display: 'grid',
          height: { md: '100vh' },
          gridTemplateColumns: { xs: '1fr', md: '380px 1fr' },
          gridTemplateRows: { xs: 'auto 60vh', md: '100%' },
          overflow: { md: 'hidden' },
          bgcolor: 'background.default',
        }}
      >
        {/* ─── SIDEBAR ─── */}
        <Box
          component="aside"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            bgcolor: '#0b1120',
            borderRight: { md: '1px solid rgba(255,255,255,0.07)' },
            borderBottom: { xs: '1px solid rgba(255,255,255,0.07)', md: 'none' },
            /* Fancy amber scrollbar */
            '&::-webkit-scrollbar': { width: '5px' },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(245,184,46,0.35)',
              borderRadius: '10px',
            },
            '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(245,184,46,0.65)' },
          }}
        >
          {/* Branded header */}
          <Box
            sx={{
              p: { xs: 2, md: 2.5 },
              pb: 2,
              flexShrink: 0,
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'linear-gradient(180deg,rgba(59,130,246,0.08) 0%,transparent 100%)',
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
                  background: 'linear-gradient(135deg,#f5b82e 0%,#f97316 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.15rem',
                  boxShadow: '0 4px 14px rgba(245,184,46,0.4)',
                }}
              >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="22" height="22" aria-hidden="true">
                <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zm-1 1 1.96 2.5H17V9h2zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2.22-3c-.55-.61-1.35-1-2.22-1s-1.67.39-2.22 1H3V6h12v9H8.22zM18 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
              </svg>
              </Box>
              <Box>
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  sx={{ color: '#f0f4ff', lineHeight: 1.2, fontSize: '1rem' }}
                >
                  Truck Route Planner
                </Typography>
                <Typography variant="caption" sx={{ color: '#7c8db5' }}>
                  Weather-aware safety routing
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Scrollable body */}
          <Box sx={{ p: { xs: 2, md: 2.5 }, flex: 1 }}>

            {/* Section label */}
            <Typography
              variant="overline"
              sx={{ color: '#4b6080', fontSize: '0.63rem', letterSpacing: '1.2px', display: 'block', mb: 1.5 }}
            >
              Trip Details
            </Typography>

            <Stack component="form" onSubmit={submit} spacing={2}>
              <TextField required fullWidth label="Origin" value={f.origin} onChange={set('origin')} placeholder="Dallas, TX" />
              <TextField required fullWidth label="Destination" value={f.destination} onChange={set('destination')} placeholder="Denver, CO" />
              <TextField
                required fullWidth label="Departure" type="datetime-local"
                value={f.departure} onChange={set('departure')}
                InputLabelProps={{ shrink: true }}
              />
              <Stack direction="row" spacing={1.5}>
                <TextField
                  required label="Load (lb)" type="number"
                  inputProps={{ min: 1, max: 150000 }}
                  value={f.weight} onChange={set('weight')}
                  sx={{ flex: 1 }}
                />
                <TextField select label="Interval" value={f.interval} onChange={set('interval')} sx={{ flex: 1 }}>
                  <MenuItem value="auto">Auto (Smart)</MenuItem>
                  {[10, 25, 50].map((n) => (<MenuItem key={n} value={n}>{n} mi</MenuItem>))}
                </TextField>
              </Stack>

              {/* Load weight quick presets */}
              <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" sx={{ mt: -0.5 }}>
                <Typography variant="caption" sx={{ color: '#7c8db5', fontSize: '0.68rem', mr: 0.25 }}>
                  Presets:
                </Typography>
                {[
                  { label: 'Empty (15k)', val: 15000 },
                  { label: 'Half (35k)', val: 35000 },
                  { label: 'Standard (40k)', val: 40000 },
                  { label: 'Max (80k)', val: 80000 },
                ].map((p) => (
                  <Chip
                    key={p.val}
                    label={p.label}
                    size="small"
                    clickable
                    onClick={() => setF((prev) => ({ ...prev, weight: p.val }))}
                    variant={+f.weight === p.val ? 'filled' : 'outlined'}
                    sx={{
                      fontSize: '0.65rem',
                      height: 20,
                      cursor: 'pointer',
                      bgcolor: +f.weight === p.val ? 'rgba(245,184,46,0.2)' : 'transparent',
                      borderColor: +f.weight === p.val ? '#f5b82e' : 'rgba(255,255,255,0.12)',
                      color: +f.weight === p.val ? '#f5b82e' : '#7c8db5',
                      '&:hover': { bgcolor: 'rgba(245,184,46,0.15)', color: '#f5b82e' },
                    }}
                  />
                ))}
              </Stack>

              <Button
                type="submit" variant="contained" color="secondary"
                disabled={busy} fullWidth size="large"
                sx={{ py: 1.4, borderRadius: 2, mt: 0.5 }}
              >
                {busy ? 'Analyzing routes...' : 'Find Safest Route'}
              </Button>
              {busy && <LinearProgress sx={{ borderRadius: 2 }} />}
            </Stack>

            {err && (
              <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{err}</Alert>
            )}

            {res && (
              <Box sx={{ mt: 3 }}>
                <Typography
                  variant="overline"
                  sx={{ color: '#4b6080', fontSize: '0.63rem', letterSpacing: '1.2px', display: 'block', mb: 1 }}
                >
                  Route Analysis
                </Typography>
                <Stack spacing={1.5}>
                  {res.notice && <Alert severity="warning" sx={{ borderRadius: 2 }}>{res.notice}</Alert>}
                  <Alert severity="success" icon={false} sx={{ borderRadius: 2, fontSize: '0.82rem', lineHeight: 1.5 }}>
                    {res.explanation}
                  </Alert>
                  {res.routes.map((r) => (
                    <RouteCard key={r.id} r={r} selected={r.id === sel} onSelect={() => setSel(r.id)} />
                  ))}
                </Stack>

                {route && (
                  <Box sx={{ mt: 2.5 }}>
                    <Typography
                      variant="overline"
                      sx={{ color: '#4b6080', fontSize: '0.63rem', letterSpacing: '1.2px', display: 'block', mb: 1 }}
                    >
                      Checkpoints — {route.label}
                    </Typography>
                    <CheckpointTable route={route} />
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>

        {/* ─── MAP PANE ─── */}
        <Box sx={{ position: 'relative', minHeight: 0, overflow: 'hidden' }}>
          <MapView res={res} route={route} onSelect={setSel} heat={heat} hour={slowHour} />

          {/* ─── HEATMAP PANEL ─── */}
          {res && (
            <Paper
              elevation={0}
              sx={{
                position: 'absolute', zIndex: 1000,
                left: '50%', bottom: { xs: 10, md: 20 },
                transform: 'translateX(-50%)',
                width: { xs: '96%', sm: 'min(540px,92%)' },
                px: { xs: 2, sm: 2.5 }, py: 2,
                borderRadius: 3,
                backdropFilter: 'blur(20px)',
                background: 'rgba(11,17,32,0.88)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.55),0 1px 0 rgba(255,255,255,0.05) inset',
              }}
            >
              {/* Row 1: toggle + slider */}
              <Stack direction="row" alignItems="center" spacing={2}>
                <FormControlLabel
                  sx={{ m: 0, flexShrink: 0 }}
                  control={<Switch size="small" checked={heat} onChange={(e) => setHeat(e.target.checked)} />}
                  label={
                    <Typography variant="body2" fontWeight={600} sx={{ color: '#f0f4ff', whiteSpace: 'nowrap' }}>
                      Heatmap
                    </Typography>
                  }
                />
                <Slider
                  min={0} max={48} value={hour}
                  onChange={(_, v) => setHour(v)}
                  disabled={!heat}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => `+${v}h`}
                  sx={{ flex: 1 }}
                  aria-label="Forecast hours after departure"
                />
                <Typography variant="caption" sx={{ color: '#7c8db5', flexShrink: 0 }}>+48h</Typography>
              </Stack>

              <Divider sx={{ my: 1.25 }} />

              {/* Row 2: timestamp + risk legend — FULLY SEPARATED */}
              <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.75}>
                <Typography
                  variant="caption" fontWeight={700}
                  sx={{ color: '#7c8db5', whiteSpace: 'nowrap', flexShrink: 0, mr: 0.5 }}
                >
                  {fmtTime(new Date(res.departure).getTime() + hour * 36e5)}
                </Typography>
                {NAMES.map((n, i) => (
                  <Chip
                    key={n} size="small" label={n}
                    sx={{ bgcolor: COLORS[i], color: '#fff', fontWeight: 600, fontSize: '0.68rem' }}
                  />
                ))}
              </Stack>
            </Paper>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
