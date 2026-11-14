"""Errores de la capa de aplicación."""


class DataUnavailable(Exception):
    """Una fuente no tiene datos para ese lugar o período. El respaldo prueba la siguiente."""

    def __init__(self, source: str, reason: str) -> None:
        super().__init__(f"{source}: {reason}")
        self.source = source
        self.reason = reason
