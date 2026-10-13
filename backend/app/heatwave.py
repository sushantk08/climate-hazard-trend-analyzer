
from datetime import date, timedelta
from math import isfinite


def calculate_percentile(
    temperatures: list[float | int | None],
    percentile: float = 95.0,
) -> float:
    # Calculate a temperature percentile, ignoring missing values.

    if not 0 <= percentile <= 100:
        raise ValueError("Percentile must be between 0 and 100.")

    valid_temperatures = []

    for value in temperatures:
        if value is None:
            continue

        try:
            temperature = float(value)
        except (TypeError, ValueError):
            continue

        if isfinite(temperature):
            valid_temperatures.append(temperature)

    if not valid_temperatures:
        raise ValueError("No valid temperatures were provided.")

    valid_temperatures.sort()

    # Find the position of the requested percentile.
    position = (len(valid_temperatures) - 1) * percentile / 100

    lower_index = int(position)
    upper_index = min(lower_index + 1, len(valid_temperatures) - 1)

    # Interpolate when the position falls between two temperatures.
    fraction = position - lower_index

    return (
        valid_temperatures[lower_index]
        + (
            valid_temperatures[upper_index]
            - valid_temperatures[lower_index]
        )
        * fraction
    )


def detect_heatwaves(
    daily_records: list[dict],
    threshold_c: float,
    min_duration: int = 3,
) -> list[dict]:
    """Find heatwaves lasting at least the required number of days."""

    if not isfinite(threshold_c):
        raise ValueError("Temperature threshold must be a finite number.")

    if min_duration < 1:
        raise ValueError("Minimum duration must be at least one day.")

    normalized_records = []

    for record in daily_records:
        try:
            day = date.fromisoformat(str(record.get("date", "")))
        except (TypeError, ValueError):
            continue

        raw_temperature = record.get("temperature_max_c")

        try:
            temperature = (
                float(raw_temperature)
                if raw_temperature is not None
                else None
            )
        except (TypeError, ValueError):
            temperature = None

        if temperature is not None and not isfinite(temperature):
            temperature = None

        normalized_records.append((day, temperature))

    normalized_records.sort(key=lambda item: item[0])

    events = []
    current_streak = []
    previous_day = None

    def save_streak():
        if len(current_streak) >= min_duration:
            temperatures = [
                temperature for _, temperature in current_streak
            ]

            events.append(
                {
                    "start_date": current_streak[0][0].isoformat(),
                    "end_date": current_streak[-1][0].isoformat(),
                    "duration_days": len(current_streak),
                    "peak_temperature_c": round(max(temperatures), 2),
                }
            )

        current_streak.clear()

    for day, temperature in normalized_records:

        # A missing calendar day breaks the consecutive day streak.
        if (
            current_streak
            and previous_day is not None
            and day != previous_day + timedelta(days=1)
        ):
            save_streak()

        if temperature is not None and temperature > threshold_c:
            current_streak.append((day, temperature))
        else:
            # A cooler or missing day ends the current streak.
            save_streak()

        previous_day = day

    # Save a heatwave that continues through the last available day.
    save_streak()

    return events
