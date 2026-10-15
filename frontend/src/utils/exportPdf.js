import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

function displayValue(value, fallback = "N/A") {
    return value === null || value === undefined || value === ""
        ? fallback
        : String(value);
}

function formatNumber(value, digits = 2) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(digits) : "N/A";
}

function describeTrend(direction, slope, unit) {
    if (slope === null || slope === undefined) {
        return "Insufficient data";
    }

    return `${displayValue(direction)} (${formatNumber(slope)} ${unit})`;
}

function describeMannKendall(result) {
    if (!result || result.p_value == null) {
        return "Insufficient data";
    }

    const direction = displayValue(result.direction);
    const pValue = formatNumber(result.p_value, 4);
    const alpha = formatNumber(result.alpha ?? 0.05, 2);

    const conclusion = result.significant
        ? "Statistically significant"
        : "Not statistically significant";

    return `${direction}; p = ${pValue}; ${conclusion} (alpha = ${alpha})`;
}

export default function exportAnalysisToPdf({
    form,
    analysis,
    temperatureStats,
}) {
    if (!analysis) {
        return;
    }

    const doc = new jsPDF();
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 18;

    const baseline = analysis.baseline || {};
    const summary = analysis.summary || {};
    const yearlyTrend = analysis.yearly_trend || {};
    const frequencyTrend = yearlyTrend.trend || {};
    const durationTrend = yearlyTrend.duration_trend || {};

    // Report title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("ClimateScope", margin, y);

    y += 7;
    doc.setFontSize(12);
    doc.text("Climate Hazard Analysis Report", margin, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);

    // Location and analysis configuration
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Analysis Details", margin, y);

    autoTable(doc, {
        startY: y + 3,
        head: [["Field", "Value"]],
        body: [
            ["Location", displayValue(form.location)],
            ["Analysis period", `${form.startDate} to ${form.endDate}`],
            [
                "Baseline period",
                `${form.baselineStartDate} to ${form.baselineEndDate}`,
            ],
            ["Latitude", displayValue(form.latitude)],
            ["Longitude", displayValue(form.longitude)],
            ["Data source", displayValue(analysis.source, "Open-Meteo")],
        ],
        theme: "grid",
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 2.5 },
    });

    y = doc.lastAutoTable.finalY + 8;

    // Explain the analytical definition
    if (y > 245) {
        doc.addPage();
        y = 18;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Detection Method", margin, y);

    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    const definition = displayValue(
        analysis.definition,
        "Three or more consecutive days above the selected baseline threshold.",
    );

    const definitionLines = doc.splitTextToSize(
        definition,
        pageWidth - margin * 2,
    );

    doc.text(definitionLines, margin, y);
    y += definitionLines.length * 4.5 + 5;

    // Summary metrics and trends
    if (y > 245) {
        doc.addPage();
        y = 18;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Summary Insights", margin, y);

    const summaryRows = [
        ["Detected heatwave events", displayValue(summary.heatwave_count, "0")],
        ["Total heatwave days", displayValue(summary.total_heatwave_days, "0")],
        [
            "Average event duration",
            `${displayValue(summary.average_duration_days, "0")} days`,
        ],
        [
            "Longest event",
            `${displayValue(summary.longest_heatwave_days, "0")} days`,
        ],
        [
            "Baseline percentile",
            `${displayValue(baseline.percentile, "95")}th percentile`,
        ],
        [
            "Temperature threshold",
            baseline.threshold_c == null
                ? "N/A"
                : `${formatNumber(baseline.threshold_c)} °C`,
        ],
        [
            "Event frequency trend",
            describeTrend(
                frequencyTrend.direction,
                frequencyTrend.slope_heatwaves_per_year,
                "events/year",
            ),
        ],
        [
            "Heatwave duration trend",
            describeTrend(
                durationTrend.direction,
                durationTrend.slope_heatwave_days_per_year,
                "days/year",
            ),
        ],

        [
            "Mann-Kendall: event frequency",
            describeMannKendall(frequencyTrend.mann_kendall),
        ],
        [
            "Mann-Kendall: heatwave days",
            describeMannKendall(durationTrend.mann_kendall),
        ],
    ];

    if (temperatureStats) {
        summaryRows.push(
            [
                "Average daily maximum",
                `${formatNumber(temperatureStats.average, 1)} °C`,
            ],
            [
                "Hottest day",
                `${formatNumber(temperatureStats.hottestDay?.temperature, 1)} °C on ${displayValue(temperatureStats.hottestDay?.date)}`,
            ],
            [
                "Coolest day",
                `${formatNumber(temperatureStats.coolestDay?.temperature, 1)} °C on ${displayValue(temperatureStats.coolestDay?.date)}`,
            ],
        );
    }

    autoTable(doc, {
        startY: y + 3,
        head: [["Metric", "Result"]],
        body: summaryRows,
        theme: "grid",
        margin: { left: margin, right: margin },
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        columnStyles: { 0: { cellWidth: 65 } },
    });

    y = doc.lastAutoTable.finalY + 8;

    // Year-by-year trend table
    if (y > 245) {
        doc.addPage();
        y = 18;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Yearly Heatwave Trends", margin, y);

    const yearlyRows = (yearlyTrend.yearly_counts || []).map((item) => [
        displayValue(item.year),
        displayValue(item.heatwave_count, "0"),
        displayValue(item.heatwave_days, "0"),
    ]);

    autoTable(doc, {
        startY: y + 3,
        head: [["Year", "Events", "Heatwave days"]],
        body:
            yearlyRows.length > 0
                ? yearlyRows
                : [["No yearly data available", "-", "-"]],
        theme: "striped",
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 2.5 },
    });

    y = doc.lastAutoTable.finalY + 8;

    // Detailed heatwave events
    if (y > 235) {
        doc.addPage();
        y = 18;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Detected Heatwave Events", margin, y);

    const eventRows = (analysis.events || []).map((event, index) => [
        String(index + 1),
        displayValue(event.start_date),
        displayValue(event.end_date),
        displayValue(event.duration_days),
        event.peak_temperature_c == null
            ? "N/A"
            : `${formatNumber(event.peak_temperature_c)} °C`,
    ]);

    autoTable(doc, {
        startY: y + 3,
        head: [
            [
                "No.",
                "Start date",
                "End date",
                "Duration (days)",
                "Peak temperature",
            ],
        ],
        body:
            eventRows.length > 0
                ? eventRows
                : [["-", "No events found", "-", "-", "-"]],
        theme: "striped",
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fontSize: 8 },
    });

    // Add a page number footer to every page.
    const pageCount = doc.internal.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(
            `ClimateScope | Page ${page} of ${pageCount}`,
            margin,
            pageHeight - 7,
        );
    }

    const safeLocation = (form.location || "location")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    doc.save(
        `climatescope-report-${safeLocation || "location"}-${form.startDate}-to-${form.endDate}.pdf`,
    );
}
