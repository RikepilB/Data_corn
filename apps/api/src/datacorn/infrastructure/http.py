"""Cliente HTTP compartido por los adaptadores (sin claves, User-Agent genérico)."""

from __future__ import annotations

import httpx

from datacorn import __version__

USER_AGENT = f"DataCorn/{__version__} (+https://github.com/RikepilB/Data_corn)"


def client(timeout: float = 60.0) -> httpx.Client:
    return httpx.Client(
        timeout=timeout, headers={"User-Agent": USER_AGENT}, follow_redirects=True
    )
