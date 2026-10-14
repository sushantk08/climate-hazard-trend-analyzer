import pytest

from app.heatwave import calculate_percentile, detect_heatwaves


def test_calculate_percentile():
    temperatures = [10, 20, 30, 40, 50]

    result = calculate_percentile(temperatures, percentile=50)

    assert result == 30


def test_percentile_ignores_missing_values():
    temperatures = [10, None, 20, 30]

    result = calculate_percentile(temperatures, percentile=50)

    assert result == 20


def test_percentile_rejects_empty_data():
    with pytest.raises(ValueError):
        calculate_percentile([None, None])


def test_detects_three_consecutive_hot_days():
    records = [
        {"date": "2024-06-01", "temperature_max_c": 35},
        {"date": "2024-06-02", "temperature_max_c": 36},
        {"date": "2024-06-03", "temperature_max_c": 37},
    ]

    events = detect_heatwaves(records, threshold_c=34)

    assert len(events) == 1
    assert events[0]["start_date"] == "2024-06-01"
    assert events[0]["end_date"] == "2024-06-03"
    assert events[0]["duration_days"] == 3
    assert events[0]["peak_temperature_c"] == 37


def test_two_hot_days_are_not_a_heatwave():
    records = [
        {"date": "2024-06-01", "temperature_max_c": 35},
        {"date": "2024-06-02", "temperature_max_c": 36},
    ]

    events = detect_heatwaves(records, threshold_c=34)

    assert events == []


def test_cool_day_breaks_hot_streak():
    records = [
        {"date": "2024-06-01", "temperature_max_c": 35},
        {"date": "2024-06-02", "temperature_max_c": 25},
        {"date": "2024-06-03", "temperature_max_c": 36},
        {"date": "2024-06-04", "temperature_max_c": 37},
    ]

    events = detect_heatwaves(records, threshold_c=34)

    assert events == []


def test_missing_temperature_breaks_hot_streak():
    records = [
        {"date": "2024-06-01", "temperature_max_c": 35},
        {"date": "2024-06-02", "temperature_max_c": None},
        {"date": "2024-06-03", "temperature_max_c": 36},
        {"date": "2024-06-04", "temperature_max_c": 37},
    ]

    events = detect_heatwaves(records, threshold_c=34)

    assert events == []


def test_missing_calendar_day_breaks_hot_streak():
    records = [
        {"date": "2024-06-01", "temperature_max_c": 35},
        {"date": "2024-06-02", "temperature_max_c": 36},
        {"date": "2024-06-04", "temperature_max_c": 37},
    ]

    events = detect_heatwaves(records, threshold_c=34)

    assert events == []


def test_temperature_equal_to_threshold_does_not_count():
    records = [
        {"date": "2024-06-01", "temperature_max_c": 34},
        {"date": "2024-06-02", "temperature_max_c": 35},
        {"date": "2024-06-03", "temperature_max_c": 36},
    ]

    events = detect_heatwaves(records, threshold_c=34)

    assert events == []
