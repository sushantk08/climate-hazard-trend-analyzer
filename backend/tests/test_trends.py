import pytest

from app.trends import (
    calculate_linear_trend,
    calculate_mann_kendall,
)

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


def test_mann_kendall_detects_significant_increasing_trend():
    result = calculate_mann_kendall(
        [2019, 2020, 2021, 2022, 2023, 2024],
        [1, 2, 3, 4, 5, 6],
    )

    assert result["direction"] == "increasing"
    assert result["s"] == 15
    assert result["p_value"] < 0.05
    assert result["significant"] is True


def test_mann_kendall_detects_decreasing_trend():
    result = calculate_mann_kendall(
        [2019, 2020, 2021, 2022, 2023, 2024],
        [6, 5, 4, 3, 2, 1],
    )

    assert result["direction"] == "decreasing"
    assert result["s"] == -15
    assert result["significant"] is True


def test_mann_kendall_detects_stable_values():
    result = calculate_mann_kendall(
        [2020, 2021, 2022, 2023],
        [3, 3, 3, 3],
    )

    assert result["direction"] == "stable"
    assert result["s"] == 0
    assert result["p_value"] == 1.0
    assert result["significant"] is False


def test_mann_kendall_applies_tie_correction():
    result = calculate_mann_kendall(
        [2019, 2020, 2021, 2022, 2023, 2024],
        [1, 2, 2, 3, 3, 4],
    )

    assert result["direction"] == "increasing"
    assert result["s"] == 13
    assert result["variance_s"] == 26.3333


def test_mann_kendall_rejects_mismatched_lengths():
    with pytest.raises(ValueError):
        calculate_mann_kendall([2020, 2021], [1])


def test_mann_kendall_requires_two_years():
    with pytest.raises(ValueError):
        calculate_mann_kendall([2020], [1])


def test_mann_kendall_rejects_invalid_alpha():
    with pytest.raises(ValueError):
        calculate_mann_kendall(
            [2020, 2021],
            [1, 2],
            alpha=1.0,
        )

