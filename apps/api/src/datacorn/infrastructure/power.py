"""Cliente de NASA POWER (sin clave)."""

from __future__ import annotations

from datetime import date

BASE_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
PARAMETERS = ("T2M_MAX", "T2M_MIN", "PRECTOTCORR", "ALLSKY_SFC_SW_DWN", "RH2M", "WS2M")
COMMUNITY = "AG"  # unidades agroclimáticas (MJ/m²/día)


class PowerClient:
    def daily_point(self, *, lat: float, lon: float, start: date, end: date) -> dict[str, object]:
        """JSON diario de POWER para un punto (el centroide del lote)."""
        raise NotImplementedError("F3: descarga diaria de NASA POWER")
