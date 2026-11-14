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
