from math import erfc, isfinite, sqrt

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


def calculate_mann_kendall(
    years: list[int],
    values: list[int | float],
    alpha: float = 0.05,
) -> dict:
    """Test for a monotonic trend using the Mann-Kendall test."""

    if len(years) != len(values):
        raise ValueError("Years and values must have the same length.")

    if len(years) < 2:
        raise ValueError("At least two years are required.")

    if len(set(years)) != len(years):
        raise ValueError("Years must not contain duplicates.")

    if not all(isinstance(year, int) for year in years):
        raise ValueError("Each year must be an integer.")

    if not 0 < alpha < 1:
        raise ValueError("Alpha must be between 0 and 1.")

    numeric_values = []

    for value in values:
        try:
            number = float(value)
        except (TypeError, ValueError):
            raise ValueError("Trend values must be valid numbers.")

        if not isfinite(number):
            raise ValueError("Trend values must be finite numbers.")

        numeric_values.append(number)

    # Arrange observations in chronological order.
    observations = sorted(zip(years, numeric_values))
    ordered_values = [value for _, value in observations]
    n = len(ordered_values)

    # Calculate S by comparing every pair of observations.
    s = 0

    for i in range(n - 1):
        for j in range(i + 1, n):
            difference = ordered_values[j] - ordered_values[i]

            if difference > 0:
                s += 1
            elif difference < 0:
                s -= 1

    # Count tied values for the variance correction.
    tie_counts = {}

    for value in ordered_values:
        tie_counts[value] = tie_counts.get(value, 0) + 1

    tie_correction = sum(
        count * (count - 1) * (2 * count + 5)
        for count in tie_counts.values()
        if count > 1
    )

    variance_s = (
        n * (n - 1) * (2 * n + 5) - tie_correction
    ) / 18

    if s > 0:
        direction = "increasing"
    elif s < 0:
        direction = "decreasing"
    else:
        direction = "stable"

    # Apply continuity correction to the normal approximation.
    if variance_s <= 0:
        z_score = 0.0
        p_value = 1.0
    else:
        standard_deviation = sqrt(variance_s)

        if s > 0:
            z_score = (s - 1) / standard_deviation
        elif s < 0:
            z_score = (s + 1) / standard_deviation
        else:
            z_score = 0.0

        # Two-sided p-value from the standard normal distribution.
        p_value = erfc(abs(z_score) / sqrt(2))

    return {
        "direction": direction,
        "s": s,
        "variance_s": round(variance_s, 4),
        "z_score": round(z_score, 4),
        "p_value": round(p_value, 6),
        "alpha": alpha,
        "significant": p_value < alpha,
        "method": "Mann-Kendall test with tie correction and normal approximation",
    }

