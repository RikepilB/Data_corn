from datacorn.domain.models import Crop
from datacorn.infrastructure.crop_catalog import YamlCropCatalog


def test_maize_parameters_load_from_yaml() -> None:
    maize = YamlCropCatalog().get(Crop.MAIZE)
    assert maize.kc.mid == 1.20
    assert maize.ky.flowering == 1.50
    assert maize.gdd_maturity_by_rm[0] == (80, 1170.0)


def test_soybean_parameters_load_from_yaml() -> None:
    soybean = YamlCropCatalog().get(Crop.SOYBEAN)
    assert soybean.gdd_maturity_by_rm == ()
