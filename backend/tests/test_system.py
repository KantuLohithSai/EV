import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models.battery_degradation import calculate_battery_degradation
from models.reliability_scoring import compute_charger_reliability_score
from services.openchargemap import fetch_open_charge_map_pois
from services.recommendation_engine import evaluate_and_recommend_stations
from services.osm_graph import build_spatial_connectivity_summary
from models.lstm_model import forecast_station_demand
from models.gat_model import infer_gat_spatial_weights

def test_battery_degradation():
    deg = calculate_battery_degradation(current_soc=20.0, target_soc=90.0, charger_power_kw=150.0)
    assert deg["degradation_penalty_score"] >= 0.0
    assert "preservation_advice" in deg
    print("[OK] test_battery_degradation PASSED")

def test_reliability_scoring():
    rel = compute_charger_reliability_score(98.0, 0, [5.0, 4.5, 4.8], 5, True)
    assert rel["reliability_score"] >= 85.0
    assert rel["is_operational"] is True
    print("[OK] test_reliability_scoring PASSED")

def test_openchargemap_fetching():
    pois = fetch_open_charge_map_pois(12.9716, 77.5946, max_results=4)
    assert len(pois) > 0
    assert "connector_types" in pois[0]
    assert "reliability" in pois[0]
    print("[OK] test_openchargemap_fetching PASSED")

def test_recommendation_engine():
    res = evaluate_and_recommend_stations(12.9716, 77.5946, current_soc=45.0, emergency_mode=False)
    assert len(res["recommendations"]) > 0
    assert res["recommendations"][0]["composite_score"] > 0
    assert "xai_explanation" in res["recommendations"][0]
    assert res["spatial_graph"]["proximity_radius_km"] == 5.0
    assert res["spatial_graph"]["attention_available"] is False
    print("[OK] test_recommendation_engine PASSED")

def test_emergency_rescue_mode():
    res = evaluate_and_recommend_stations(12.9716, 77.5946, current_soc=5.0, emergency_mode=True)
    assert res["emergency_rescue_active"] is True
    assert len(res["recommendations"]) > 0
    print("[OK] test_emergency_rescue_mode PASSED")

def test_lstm_forecasting():
    forecast = forecast_station_demand("ocm-101", [])
    assert "20_min" in forecast
    assert "40_min" in forecast
    assert "60_min" in forecast
    assert 0.0 <= forecast["20_min"]["predicted_occupancy_ratio"] <= 1.0
    print("[OK] test_lstm_forecasting PASSED")

def test_gat_inference():
    nodes = [{'lat': 12.9, 'lng': 77.5, 'node_type_id': 1}, {'lat': 12.91, 'lng': 77.51, 'node_type_id': 0}]
    adj = [[1, 1], [1, 1]]
    att, emb = infer_gat_spatial_weights(nodes, adj)
    assert len(att) == 2
    assert len(emb) == 2
    print("[OK] test_gat_inference PASSED")

def test_spatial_connectivity_summary():
    stations = [
        {"id": "near-1", "lat": 0.03, "lng": 0.0},
        {"id": "near-2", "lat": 0.06, "lng": 0.0},
        {"id": "far", "lat": 0.2, "lng": 0.0},
        {"id": "invalid", "lat": None, "lng": 0.0},
    ]
    graph = build_spatial_connectivity_summary(0.0, 0.0, stations)
    assert graph["station_metrics"]["near-1"]["hops_from_ev"] == 1
    assert graph["station_metrics"]["near-2"]["hops_from_ev"] == 2
    assert graph["station_metrics"]["far"]["hops_from_ev"] is None
    assert "invalid" not in graph["station_metrics"]
    assert graph["attention_available"] is False
    print("[OK] test_spatial_connectivity_summary PASSED")

if __name__ == '__main__':
    print("=== Running Complete Backend Test Suite ===")
    test_battery_degradation()
    test_reliability_scoring()
    test_openchargemap_fetching()
    test_recommendation_engine()
    test_emergency_rescue_mode()
    test_lstm_forecasting()
    test_gat_inference()
    test_spatial_connectivity_summary()
    print("=== ALL 8 BACKEND TESTS PASSED SUCCESSFULLY! ===")

