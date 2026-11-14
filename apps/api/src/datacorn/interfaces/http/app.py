"""Aplicación FastAPI."""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from datacorn import __version__
from datacorn.application.errors import DataUnavailable
from datacorn.bootstrap import Container
from datacorn.domain.errors import InvalidFieldGeometry
from datacorn.interfaces.http.routes import demo, fields, health, regions

API_PREFIX = "/api/v1"


def create_app(container: Container) -> FastAPI:
    app = FastAPI(
        title="Data Corn API",
        version=__version__,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )
    app.state.container = container
    app.add_middleware(
        CORSMiddleware,
        allow_origins=container.settings.allowed_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )
    for module in (health, regions, demo, fields):
        app.include_router(module.router, prefix=API_PREFIX)

    @app.exception_handler(NotImplementedError)
    async def _not_implemented(_: Request, exc: NotImplementedError) -> JSONResponse:
        # Mientras un paso no esté construido, la ruta dice cuál falta (p. ej. "F4: ...").
        return JSONResponse(
            status_code=501, content={"error": "not_implemented", "detail": str(exc)}
        )

    @app.exception_handler(InvalidFieldGeometry)
    async def _invalid_geometry(_: Request, exc: InvalidFieldGeometry) -> JSONResponse:
        return JSONResponse(
            status_code=422, content={"error": "invalid_geometry", "reason": exc.reason}
        )

    @app.exception_handler(DataUnavailable)
    async def _no_data(_: Request, exc: DataUnavailable) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={"error": "data_unavailable", "source": exc.source, "reason": exc.reason},
        )

    return app
