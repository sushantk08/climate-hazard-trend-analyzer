
import pytest

from app.trends import calculate_linear_trend


def test_increasing_trend():
    result = calculate_linear_trend(
        [2020, 2021, 2022, 2023],
        [2, 3, 4, 5],
    )

    assert result["direction"] == "increasing"
    assert result["slope_per_year"] == 1.0


def test_decreasing_trend():
    result = calculate_linear_trend(
        [2020, 2021, 2022, 2023],
        [5, 4, 3, 2],
    )

    assert result["direction"] == "decreasing"
    assert result["slope_per_year"] == -1.0


def test_stable_trend():
    result = calculate_linear_trend(
        [2020, 2021, 2022],
        [3, 3, 3],
    )

    assert result["direction"] == "stable"
    assert result["slope_per_year"] == 0.0


def test_years_and_values_must_match():
    with pytest.raises(ValueError):
        calculate_linear_trend([2020, 2021], [3])


def test_at_least_two_years_are_required():
    with pytest.raises(ValueError):
        calculate_linear_trend([2020], [3])


def test_duplicate_years_are_rejected():
    with pytest.raises(ValueError):
        calculate_linear_trend([2020, 2020], [2, 3])
