"""Punto de entrada de la API: `uvicorn datacorn.main:app`."""

from datacorn.bootstrap import build_container
from datacorn.config import Settings
from datacorn.interfaces.http.app import create_app

app = create_app(build_container(Settings()))
