"""Errores del dominio."""


class DomainError(Exception):
    """Base de los errores del dominio."""


class InvalidFieldGeometry(DomainError):
    """El contorno no cumple las reglas de RF-04."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason
