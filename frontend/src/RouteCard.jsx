import { Box, Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material';
import { COLORS, NAMES, ROUTE_COLORS, fmtDur, fmtTime } from './lib';

export default function RouteCard({ r, selected, onSelect }) {
  const m = r.summary.miles_by_level;
  const rc = ROUTE_COLORS[r.id];
  return (
    <Card
      variant="outlined"
      sx={{
        borderLeft: `4px solid ${rc}`,
        border: selected ? `1px solid ${rc}55` : '1px solid rgba(255,255,255,0.07)',
        borderLeftColor: `${rc} !important`,
        borderLeftWidth: '4px !important',
        bgcolor: selected ? 'rgba(255,255,255,0.03)' : '#111827',
        boxShadow: selected ? `0 0 0 1px ${rc}28, 0 4px 20px rgba(0,0,0,0.35)` : 'none',
        '&:hover': {
          bgcolor: 'rgba(255,255,255,0.04)',
          transform: 'translateY(-1px)',
          boxShadow: '0 4px 18px rgba(0,0,0,0.45)',
        },
      }}
    >
      <CardActionArea onClick={onSelect} sx={{ '&:hover .MuiCardActionArea-focusHighlight': { opacity: 0 } }}>
        <CardContent sx={{ py: 1.5, px: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
            <Typography fontWeight={700} sx={{ color: '#f0f4ff' }}>{r.label}</Typography>
            {r.recommended && (
              <Chip
                size="small"
                label="★ Recommended"
                sx={{
                  bgcolor: 'rgba(59,130,246,0.12)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59,130,246,0.25)',
                  fontWeight: 700,
                  fontSize: '0.67rem',
                }}
              />
            )}
            {r.summary.no_travel_mi >= 1 && (
              <Chip size="small" color="error" label="⚠ No Travel miles" sx={{ fontSize: '0.67rem' }} />
            )}
          </Stack>
          <Typography variant="body2" sx={{ color: '#7c8db5', mb: 0.3 }}>
            {Math.round(r.distance_mi)} mi · {fmtDur(r.duration_h)} · arrives {fmtTime(r.arrival)}
          </Typography>
          <Typography sx={{ color: '#4b6080', fontSize: '0.74rem' }}>
            Avg risk {r.summary.avg_risk}/4 · Severe {m.Severe} mi · High {m.High} mi · Moderate {m.Moderate} mi
          </Typography>
          <Box sx={{ display: 'flex', height: 5, mt: 1.5, borderRadius: '3px', overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.06)' }}>
            {NAMES.map((n, i) => m[n] > 0 && (
              <Box key={n} title={`${n}: ${m[n]} mi`} sx={{ flex: m[n], bgcolor: COLORS[i] }} />
            ))}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
