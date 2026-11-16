# SI-assisted (Claude Code); reviewed by <name>
"""Annual cover-management factors (C) by crop and tillage, for the relative erosion index.

Source: Alberts, Wendt & Burwell (1985), Soil Sci. Soc. Am. J. 49:721-728, Table 5, "Measured
C factors", annual column. Seven years of natural-rainfall plots on a claypan soil in central
Missouri, so the values are a field-measured reference, not a national table.

Team assumptions, recorded as limits:
- "reduced" tillage uses the paper's "field cultivation" values.
- The corn-soybean rotation has no measured value: it is the mean of the corn and soybean values.
- Rye cover has no source, so it returns None (no data), never an invented value.
"""

from __future__ import annotations

from datacorn.domain.models import Tillage
from datacorn.domain.report import RotationStrategy

CORN: dict[Tillage, float] = {Tillage.CONVENTIONAL: 0.08, Tillage.REDUCED: 0.04, Tillage.NO_TILL: 0.01}
SOYBEAN: dict[Tillage, float] = {Tillage.CONVENTIONAL: 0.18, Tillage.REDUCED: 0.08, Tillage.NO_TILL: 0.02}


def cover_factor(strategy: RotationStrategy | None, tillage: Tillage) -> float | None:
    if strategy is RotationStrategy.CONTINUOUS_CORN:
        return CORN[tillage]
    if strategy is RotationStrategy.CORN_SOYBEAN:
        return (CORN[tillage] + SOYBEAN[tillage]) / 2
    return None
