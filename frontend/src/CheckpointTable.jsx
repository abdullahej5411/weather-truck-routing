import { Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { COLORS, fmtTime } from "./lib";

export default function CheckpointTable({ route }) {
  return (
    <>
      <Typography variant="subtitle2" sx={{ mt: 2 }}>{route.label} checkpoints</Typography>
      <TableContainer sx={{ maxHeight: 320 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>{["Mile", "ETA", "Wind mph", "Rain in/hr", "Snow in/hr", "Risk"].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow>
          </TableHead>
          <TableBody>
            {route.checkpoints.map((p) => (
              <TableRow key={p.mile} hover title={p.reasons.join("\n")}>
                <TableCell>{Math.round(p.mile)}</TableCell>
                <TableCell>{fmtTime(p.eta)}</TableCell>
                <TableCell>{p.wind}</TableCell><TableCell>{p.rain}</TableCell><TableCell>{p.snow}</TableCell>
                <TableCell><Chip size="small" label={p.level_name} sx={{ bgcolor: COLORS[p.level], color: "#fff", fontWeight: 600 }} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
