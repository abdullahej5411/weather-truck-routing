import { Box, Card, CardActionArea, CardContent, Chip, Stack, Typography } from "@mui/material";
import { COLORS, NAMES, ROUTE_COLORS, fmtDur, fmtTime } from "./lib";

export default function RouteCard({ r, selected, onSelect }) {
  const m = r.summary.miles_by_level;
  return (
    <Card variant="outlined" sx={{ borderLeft: 6, borderLeftColor: ROUTE_COLORS[r.id], outline: selected ? "2px solid" : "none", outlineColor: "primary.main" }}>
      <CardActionArea onClick={onSelect}>
        <CardContent sx={{ py: 1.5 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography fontWeight={700}>{r.label}</Typography>
            {r.recommended && <Chip size="small" color="primary" label="Recommended" />}
            {r.summary.no_travel_mi >= 1 && <Chip size="small" color="error" label="Has No Travel miles" />}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {Math.round(r.distance_mi)} mi, {fmtDur(r.duration_h)}, arrives {fmtTime(r.arrival)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Average risk {r.summary.avg_risk} of 4. Severe {m.Severe} mi, High {m.High} mi, Moderate {m.Moderate} mi.
          </Typography>
          <Box sx={{ display: "flex", height: 8, mt: 1, borderRadius: 1, overflow: "hidden", bgcolor: "grey.200" }}>
            {NAMES.map((n, i) => m[n] > 0 && <Box key={n} title={`${n}: ${m[n]} mi`} sx={{ flex: m[n], bgcolor: COLORS[i] }} />)}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
