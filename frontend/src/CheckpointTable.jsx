import { useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogContent, DialogTitle,
  IconButton, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from '@mui/material';
import { COLORS, NAMES, fmtTime } from './lib';

export default function CheckpointTable({ route }) {
  const [view, setView] = useState('cards'); // 'cards' | 'table'
  const [openModal, setOpenModal] = useState(false);
  const [riskFilter, setRiskFilter] = useState('ALL');

  if (!route || !route.checkpoints) return null;

  const filteredCheckpoints = riskFilter === 'ALL'
    ? route.checkpoints
    : route.checkpoints.filter((p) => p.level_name.toLowerCase() === riskFilter.toLowerCase());

  return (
    <Box sx={{ width: '100%' }}>
      {/* ─── Header Toolbar ─── */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        {/* Toggle between Cards & Table */}
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            bgcolor: 'rgba(255,255,255,0.04)',
            p: 0.35,
            borderRadius: 1.5,
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Button
            size="small"
            onClick={() => setView('cards')}
            sx={{
              py: 0.25, px: 1, fontSize: '0.68rem', minWidth: 0,
              bgcolor: view === 'cards' ? 'rgba(59,130,246,0.25)' : 'transparent',
              color: view === 'cards' ? '#93c5fd' : '#7c8db5',
              fontWeight: view === 'cards' ? 700 : 500,
              borderRadius: 1,
              '&:hover': { bgcolor: 'rgba(59,130,246,0.35)' },
            }}
          >
            Cards
          </Button>
          <Button
            size="small"
            onClick={() => setView('table')}
            sx={{
              py: 0.25, px: 1, fontSize: '0.68rem', minWidth: 0,
              bgcolor: view === 'table' ? 'rgba(59,130,246,0.25)' : 'transparent',
              color: view === 'table' ? '#93c5fd' : '#7c8db5',
              fontWeight: view === 'table' ? 700 : 500,
              borderRadius: 1,
              '&:hover': { bgcolor: 'rgba(59,130,246,0.35)' },
            }}
          >
            Table
          </Button>
        </Stack>

        {/* Expand button for full-screen analysis */}
        <Button
          size="small"
          onClick={() => setOpenModal(true)}
          startIcon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          }
          sx={{
            py: 0.3, px: 1,
            color: '#f5b82e',
            fontSize: '0.72rem',
            fontWeight: 600,
            bgcolor: 'rgba(245,184,46,0.08)',
            border: '1px solid rgba(245,184,46,0.2)',
            borderRadius: 1.5,
            '&:hover': { bgcolor: 'rgba(245,184,46,0.18)' },
          }}
        >
          Full Table
        </Button>
      </Stack>

      {/* ─── SIDEBAR VIEW: CARDS (Clean, zero horizontal scroll) ─── */}
      {view === 'cards' ? (
        <Box
          sx={{
            maxHeight: 290,
            overflowY: 'auto',
            pr: 0.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(245,184,46,0.35) transparent',
          }}
        >
          {route.checkpoints.map((p) => (
            <Box
              key={p.mile}
              title={p.reasons.join('\n')}
              sx={{
                p: 1.2,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderLeft: `4px solid ${COLORS[p.level]}`,
                transition: 'all 0.15s ease',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.05)',
                  transform: 'translateX(2px)',
                },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#f0f4ff', lineHeight: 1.2, fontSize: '0.82rem' }}>
                    Mile {Math.round(p.mile)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#7c8db5', fontSize: '0.72rem' }}>
                    ETA {fmtTime(p.eta)}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={p.level_name}
                  sx={{
                    bgcolor: COLORS[p.level],
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.66rem',
                    height: 20,
                    borderRadius: '5px',
                  }}
                />
              </Stack>

              <Stack direction="row" spacing={1.5} sx={{ mt: 0.8 }} flexWrap="wrap">
                <Typography variant="caption" sx={{ color: '#7c8db5', fontSize: '0.72rem' }}>
                  Wind: <strong style={{ color: '#f0f4ff' }}>{p.wind}</strong> mph
                </Typography>
                <Typography variant="caption" sx={{ color: '#7c8db5', fontSize: '0.72rem' }}>
                  Rain: <strong style={{ color: '#f0f4ff' }}>{p.rain}</strong> in/h
                </Typography>
                <Typography variant="caption" sx={{ color: '#7c8db5', fontSize: '0.72rem' }}>
                  Snow: <strong style={{ color: '#f0f4ff' }}>{p.snow}</strong> in/h
                </Typography>
              </Stack>
            </Box>
          ))}
        </Box>
      ) : (
        /* ─── SIDEBAR VIEW: COMPACT TABLE ─── */
        <TableContainer
          sx={{
            maxHeight: 280,
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.06)',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(245,184,46,0.35) transparent',
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {['Mile', 'ETA', 'Wind', 'Rain', 'Snow', 'Risk'].map((h) => (
                  <TableCell key={h} sx={{ px: 0.75, py: 0.75 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {route.checkpoints.map((p) => (
                <TableRow
                  key={p.mile}
                  hover
                  title={p.reasons.join('\n')}
                  sx={{ '&.MuiTableRow-hover:hover': { bgcolor: 'rgba(255,255,255,0.04) !important' } }}
                >
                  <TableCell sx={{ color: '#f0f4ff', px: 0.75, py: 0.7 }}>{Math.round(p.mile)}</TableCell>
                  <TableCell sx={{ color: '#f0f4ff', whiteSpace: 'nowrap', px: 0.75, py: 0.7, fontSize: '0.72rem' }}>
                    {fmtTime(p.eta)}
                  </TableCell>
                  <TableCell sx={{ color: '#f0f4ff', px: 0.75, py: 0.7 }}>{p.wind}</TableCell>
                  <TableCell sx={{ color: '#f0f4ff', px: 0.75, py: 0.7 }}>{p.rain}</TableCell>
                  <TableCell sx={{ color: '#f0f4ff', px: 0.75, py: 0.7 }}>{p.snow}</TableCell>
                  <TableCell sx={{ px: 0.75, py: 0.7 }}>
                    <Chip
                      size="small"
                      label={p.level_name}
                      sx={{ bgcolor: COLORS[p.level], color: '#fff', fontWeight: 600, fontSize: '0.65rem', height: 18 }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ─── EXPANDED FULL TABLE MODAL ─── */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#0f172a',
            backgroundImage: 'none',
            borderRadius: 3,
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
            maxHeight: '85vh',
          },
        }}
      >
        <DialogTitle sx={{ px: 3, pt: 2.5, pb: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#f0f4ff', fontSize: '1.05rem' }}>
                {route.label} — Checkpoints & Weather Log
              </Typography>
              <Typography variant="caption" sx={{ color: '#7c8db5' }}>
                {Math.round(route.distance_mi)} miles • {route.checkpoints.length} sample points
              </Typography>
            </Box>
            <IconButton
              onClick={() => setOpenModal(false)}
              size="small"
              sx={{ color: '#7c8db5', '&:hover': { color: '#f0f4ff', bgcolor: 'rgba(255,255,255,0.08)' } }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </IconButton>
          </Stack>

          {/* Filter Pills */}
          <Stack direction="row" spacing={0.75} sx={{ mt: 1.5 }} flexWrap="wrap">
            <Typography variant="caption" sx={{ color: '#7c8db5', alignSelf: 'center', mr: 0.5, fontSize: '0.72rem' }}>
              Filter by Risk:
            </Typography>
            {['ALL', ...NAMES].map((name) => (
              <Chip
                key={name}
                size="small"
                label={name}
                clickable
                onClick={() => setRiskFilter(name)}
                variant={riskFilter === name ? 'filled' : 'outlined'}
                sx={{
                  fontSize: '0.68rem',
                  height: 22,
                  bgcolor: riskFilter === name ? 'rgba(59,130,246,0.3)' : 'transparent',
                  borderColor: riskFilter === name ? '#3b82f6' : 'rgba(255,255,255,0.12)',
                  color: riskFilter === name ? '#93c5fd' : '#7c8db5',
                  '&:hover': { bgcolor: 'rgba(59,130,246,0.2)' },
                }}
              />
            ))}
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 0, overflowY: 'auto' }}>
          <TableContainer sx={{ maxHeight: '60vh' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: '#0f172a', py: 1.2, px: 2 }}>Mile</TableCell>
                  <TableCell sx={{ bgcolor: '#0f172a', py: 1.2, px: 2 }}>Estimated Arrival (ETA)</TableCell>
                  <TableCell sx={{ bgcolor: '#0f172a', py: 1.2, px: 2 }}>Wind (mph)</TableCell>
                  <TableCell sx={{ bgcolor: '#0f172a', py: 1.2, px: 2 }}>Rain (in/hr)</TableCell>
                  <TableCell sx={{ bgcolor: '#0f172a', py: 1.2, px: 2 }}>Snow (in/hr)</TableCell>
                  <TableCell sx={{ bgcolor: '#0f172a', py: 1.2, px: 2 }}>Risk Level</TableCell>
                  <TableCell sx={{ bgcolor: '#0f172a', py: 1.2, px: 2 }}>Factors</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCheckpoints.map((p) => (
                  <TableRow
                    key={p.mile}
                    hover
                    sx={{ '&.MuiTableRow-hover:hover': { bgcolor: 'rgba(255,255,255,0.03) !important' } }}
                  >
                    <TableCell sx={{ color: '#f0f4ff', fontWeight: 600, py: 1, px: 2 }}>
                      {Math.round(p.mile)}
                    </TableCell>
                    <TableCell sx={{ color: '#f0f4ff', whiteSpace: 'nowrap', py: 1, px: 2 }}>
                      {fmtTime(p.eta)}
                    </TableCell>
                    <TableCell sx={{ color: '#f0f4ff', py: 1, px: 2 }}>{p.wind} mph</TableCell>
                    <TableCell sx={{ color: '#f0f4ff', py: 1, px: 2 }}>{p.rain} in/hr</TableCell>
                    <TableCell sx={{ color: '#f0f4ff', py: 1, px: 2 }}>{p.snow} in/hr</TableCell>
                    <TableCell sx={{ py: 1, px: 2 }}>
                      <Chip
                        size="small"
                        label={p.level_name}
                        sx={{ bgcolor: COLORS[p.level], color: '#fff', fontWeight: 600, fontSize: '0.7rem', height: 20 }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#7c8db5', fontSize: '0.75rem', py: 1, px: 2 }}>
                      {p.reasons.join(', ')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
