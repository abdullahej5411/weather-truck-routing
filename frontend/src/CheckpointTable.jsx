import { Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { COLORS, fmtTime } from './lib';

export default function CheckpointTable({ route }) {
  return (
    <TableContainer
      sx={{
        maxHeight: 270,
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.06)',
        /* Fancy amber scrollbars */
        '&::-webkit-scrollbar': { width: '4px', height: '4px' },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': { background: 'rgba(245,184,46,0.35)', borderRadius: '4px' },
        '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(245,184,46,0.65)' },
      }}
    >
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {['Mile', 'ETA', 'Wind (mph)', 'Rain (in/h)', 'Snow (in/h)', 'Risk'].map((h) => (
              <TableCell key={h}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {route.checkpoints.map((p) => (
            <TableRow
              key={p.mile} hover
              title={p.reasons.join('\n')}
              sx={{ '&.MuiTableRow-hover:hover': { bgcolor: 'rgba(255,255,255,0.03) !important' } }}
            >
              <TableCell sx={{ color: '#f0f4ff' }}>{Math.round(p.mile)}</TableCell>
              <TableCell sx={{ color: '#f0f4ff', whiteSpace: 'nowrap' }}>{fmtTime(p.eta)}</TableCell>
              <TableCell sx={{ color: '#f0f4ff' }}>{p.wind}</TableCell>
              <TableCell sx={{ color: '#f0f4ff' }}>{p.rain}</TableCell>
              <TableCell sx={{ color: '#f0f4ff' }}>{p.snow}</TableCell>
              <TableCell>
                <Chip
                  size="small" label={p.level_name}
                  sx={{ bgcolor: COLORS[p.level], color: '#fff', fontWeight: 600, fontSize: '0.68rem', borderRadius: '5px' }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
