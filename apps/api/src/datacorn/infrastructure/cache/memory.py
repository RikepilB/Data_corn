"""Caché en memoria (desarrollo local y primer nivel en Cloud Run)."""

from __future__ import annotations

from collections import OrderedDict
from typing import TypeVar

T = TypeVar("T")


class MemoryCache:
    def __init__(self, max_entries: int = 512) -> None:
        self._data: OrderedDict[str, object] = OrderedDict()
        self._max = max_entries

    def get(self, key: str, type_: type[T]) -> T | None:
        value = self._data.get(key)
        if not isinstance(value, type_):
            return None
        self._data.move_to_end(key)
        return value

    def put(self, key: str, value: object) -> None:
        self._data[key] = value
        self._data.move_to_end(key)
        while len(self._data) > self._max:
            self._data.popitem(last=False)
