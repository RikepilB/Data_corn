from __future__ import annotations

from fastapi.testclient import TestClient

RING = [[-98.0, 40.9], [-97.99, 40.9], [-97.99, 40.91], [-98.0, 40.91], [-98.0, 40.9]]
FIELD = {"type": "Polygon", "coordinates": [RING]}


def test_health(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_regions_lists_us(client: TestClient) -> None:
    response = client.get("/api/v1/regions")
    assert response.status_code == 200
    assert "us" in {r["id"] for r in response.json()}


def test_demo_fields_empty_until_f9(client: TestClient) -> None:
    assert client.get("/api/v1/demo-fields").json() == []


def test_describe_rejects_crossing_sides(client: TestClient) -> None:
    bowtie = [[-98.0, 40.9], [-97.99, 40.91], [-97.99, 40.9], [-98.0, 40.91], [-98.0, 40.9]]
    response = client.post(
        "/api/v1/fields/describe",
        json={"geometry": {"type": "Polygon", "coordinates": [bowtie]}, "season": 2027},
    )
    assert response.status_code == 422
    assert response.json() == {"error": "invalid_geometry", "reason": "self_intersection"}


def test_analyze_validates_form(client: TestClient) -> None:
    body = {"geometry": FIELD, "season": 2027, "planting_date": "2027-05-01", "hybrid_rm_days": 200}
    assert client.post("/api/v1/fields/analyze", json=body).status_code == 422


def test_drought_tiles_need_earth_engine(client: TestClient) -> None:
    response = client.get("/api/v1/layers/drought/tiles", params={"date": "2026-07"})
    assert response.status_code == 422
    assert response.json()["error"] == "data_unavailable"
    assert response.json()["source"] == "earth_engine"


def test_drought_tiles_reject_a_date_that_is_not_a_month(client: TestClient) -> None:
    for bad in ("2026-13", "2026-07-01", "julio"):
        response = client.get("/api/v1/layers/drought/tiles", params={"date": bad})
        assert response.status_code == 422
        assert "error" not in response.json()  # lo rechaza la validación, no el caso de uso


def test_enso_now(client: TestClient) -> None:
    body = client.get("/api/v1/enso").json()
    assert body["current"]["phase"] == "el_nino"
    assert body["recent"]
