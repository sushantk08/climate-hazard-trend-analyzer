from math import isfinite


def calculate_linear_trend(
    years: list[int],
    values: list[int | float],
) -> dict:
    """Calculate the yearly trend using simple linear regression."""

    if len(years) != len(values):
        raise ValueError("Years and values must have the same length.")

    if len(years) < 2:
        raise ValueError("At least two years are required.")

    if len(set(years)) != len(years):
        raise ValueError("Years must not contain duplicates.")

    if not all(isinstance(year, int) for year in years):
        raise ValueError("Each year must be an integer.")

    numeric_values = []

    for value in values:
        try:
            number = float(value)
        except (TypeError, ValueError):
            raise ValueError("Trend values must be valid numbers.")

        if not isfinite(number):
            raise ValueError("Trend values must be finite numbers.")

        numeric_values.append(number)

    mean_year = sum(years) / len(years)
    mean_value = sum(numeric_values) / len(numeric_values)

    numerator = sum(
        (year - mean_year) * (value - mean_value)
        for year, value in zip(years, numeric_values)
    )

    denominator = sum(
        (year - mean_year) ** 2
        for year in years
    )

    slope = numerator / denominator

    if slope > 0.000000001:
        direction = "increasing"
    elif slope < -0.000000001:
        direction = "decreasing"
    else:
        direction = "stable"

    return {
        "direction": direction,
        "slope_per_year": round(slope, 4),
    }
