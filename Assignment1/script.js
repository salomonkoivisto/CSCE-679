/*
In this task, you need to draw a Matrix View to visualize the Monthly Temperature of Hong Kong,
where the color of each matrix cell encodes the temperature. You can find the data in
temperature_daily.csv. You only need to focus on the last 10 years of data.

Here are the basic requirements:

    1. In the matrix, the x direction indicates the year,
       and the y direction indicates the month. Each cell
       indicates the corresponding month of a specific year.

    2. You need to visualize the maximum and minimum temperatures
       by month using the background color of each cell.
       Please use a mouse click to switch between the maximum and minimum temperatures.

    3. When hovering the mouse on each cell, a tip should appear
       to show the date and the temperature value.

    4. Add a mini line chart to each cell to show daily temperature changes.
       The x-axis represents the days in a month, and the y-axis represents the temperature.

    5. A legend is needed to show the mapping between colors and values.
*/

(async function () {

    // Github location
    const CSV_URL =
        "https://raw.githubusercontent.com/salomonkoivisto/CSCE-679/main/Assignment1/temperature_daily.csv";

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    // Format of the date string
    const parseDate = d3.timeParse("%Y-%m-%d");

    // Extract raw data as (date, year, month, day, max_temp, min_temp)
    const raw = await d3.csv(CSV_URL, d => ({
        date: parseDate(d.date),
        year: +d.date.slice(0, 4),
        month: +d.date.slice(5, 7),
        day: +d.date.slice(8, 10),
        max: +d.max_temperature,
        min: +d.min_temperature
    }));

    // Focus on the last 10 years of data
    const allYears = Array.from(new Set(raw.map(d => d.year))).sort((a, b) => a - b); // Set removes duplicates; Sort array in ascending order
    const maxYear = d3.max(allYears);
    const years = d3.range(maxYear - 9, maxYear + 1);

    const data = raw.filter(d => years.includes(d.year)); // Filter data based on last 10 years

    // ---- Group by year/month ----
    const grouped = d3.group(data, d => d.year, d => d.month);

    const monthly = [];
    let globalMin = Infinity;
    let globalMax = -Infinity;

    // Build year x month grid
    years.forEach((y, xi) => {
        for (let m = 1; m <= 12; m++) {
            const days = grouped.get(y)?.get(m) || []; // Get the daily data for that year/month

            const monthMax = d3.max(days, d => d.max); // Monthly max
            const monthMin = d3.min(days, d => d.min); // Monthly min

            // Update global maximums/minimums
            if (monthMax != null) globalMax = Math.max(globalMax, monthMax);
            if (monthMin != null) globalMin = Math.min(globalMin, monthMin);

            // Build the matrix
            monthly.push({
                year: y,
                month: m,
                xIndex: xi,
                yIndex: m - 1,
                days,
                monthMax,
                monthMin
            });
        }
    });

    // Robust layout calculation
    const cellW = 90;
    const cellH = 60;
    const gap = 8;

    const margin = {
        top: 80,
        right: 120,
        bottom: 40,
        left: 90
    };

    const width =
        margin.left +
        years.length * (cellW + gap) -
        gap +
        margin.right;

    const height =
        margin.top +
        12 * (cellH + gap) -
        gap +
        margin.bottom;

    // Create the canvas    
    const svg = d3.select("body")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Visualization title
    svg.append("text")
        .attr("x", margin.left)
        .attr("y", 35)
        .attr("font-size", 20)
        .attr("font-weight", 700)
        .text("Monthly Matrix View — Hong Kong (Last 10 Years)");

    // Toggle max/min button
    let mode = "max";

    const toggle = svg.append("text")
        .attr("x", width - margin.right)
        .attr("y", 35)
        .attr("text-anchor", "end")
        .attr("font-size", 13)
        .style("cursor", "pointer")
        .text("Showing: MAX (click to toggle)")
        .on("click", () => {
            mode = mode === "max" ? "min" : "max";
            toggle.text(`Showing: ${mode.toUpperCase()} (click to toggle)`);
            update();
        });

    // Color scale
    const color = d3.scaleSequential()
        .domain([globalMax, globalMin]) // Reversed so that high temp -> red
        .interpolator(d3.interpolateRdYlBu); // Color scheme: Red -> Yellow -> Blue

    // Mini line chart scales    
    const xMini = d3.scaleLinear().domain([1, 31]).range([5, cellW - 5]);
    const yMini = d3.scaleLinear().domain([globalMin, globalMax]).range([cellH - 5, 5]); // Range inverted so that low temp -> bottom

    // Create mini line charts
    const line = d3.line()
        .defined(d => d.value != null)
        .x(d => xMini(d.day))
        .y(d => yMini(d.value));

    // Grid container
    const grid = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Month labels
    svg.append("g")
        .attr("transform", `translate(${margin.left - 10},${margin.top})`)
        .selectAll("text")
        .data(months)
        .enter()
        .append("text")
        .attr("x", -5)
        .attr("y", (d, i) => i * (cellH + gap) + cellH / 2)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .attr("font-size", 12)
        .text(d => d);

    // Year labels
    svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top - 20})`)
        .selectAll("text")
        .data(years)
        .enter()
        .append("text")
        .attr("x", (d, i) => i * (cellW + gap) + cellW / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .text(d => d);

    // Tooltip
    const tooltip = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "rgba(0,0,0,0.8)")
        .style("color", "white")
        .style("padding", "6px 8px")
        .style("font-size", "12px")
        .style("border-radius", "4px")
        .style("display", "none");

    // Matrix cells and hovering
    const cell = grid.selectAll(".cell")
        .data(monthly)
        .enter()
        .append("g")
        .attr("class", "cell")
        .attr("transform", d =>
            `translate(${d.xIndex * (cellW + gap)},${d.yIndex * (cellH + gap)})`
        )
        .on("mouseover", (event, d) => {
            const val = mode === "max" ? d.monthMax : d.monthMin;
            tooltip.style("display", "block")
                .html(`<strong>${months[d.month - 1]} ${d.year}</strong><br>${mode.toUpperCase()}: ${val} °C`);
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY + 10) + "px");
        })
        .on("mouseout", () => tooltip.style("display", "none"));

    // Background box of each cell    
    cell.append("rect")
        .attr("width", cellW)
        .attr("height", cellH)
        .attr("rx", 6)
        .attr("stroke", "#ddd");

    // Mini line inside each cell    
    cell.append("path")
        .attr("fill", "none")
        .attr("stroke-width", 1.5);

    // Legend
    const legendHeight = 220;
    const legendX = width - margin.right + 30;
    const legendY = margin.top;

    // Vertical color gradient
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "legendGrad")
        .attr("x1", "0%").attr("x2", "0%")
        .attr("y1", "0%").attr("y2", "100%");

    // Color stops    
    for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        gradient.append("stop")
            .attr("offset", `${t * 100}%`)
            .attr("stop-color", d3.interpolateRdYlBu(t));
    }

    // Cells consistent with legend
    svg.append("rect")
        .attr("x", legendX)
        .attr("y", legendY)
        .attr("width", 20)
        .attr("height", legendHeight)
        .attr("fill", "url(#legendGrad)");

    // Scale of the legend    
    const legendScale = d3.scaleLinear()
        .domain([globalMax, globalMin])
        .range([0, legendHeight]);

    svg.append("g")
        .attr("transform", `translate(${legendX + 20},${legendY})`)
        .call(d3.axisRight(legendScale).ticks(6));

    svg.append("text")
        .attr("x", legendX)
        .attr("y", legendY - 10)
        .attr("font-size", 12)
        .attr("font-weight", 600)
        .text("Temperature (°C)");

    // Update function (user clicks toggle)
    function update() {
        cell.select("rect") // update cell background colors
            .transition()
            .duration(300)
            .attr("fill", d => {
                const val = mode === "max" ? d.monthMax : d.monthMin;
                return color(val);
            });

        cell.select("path") // update mini line charts
            .transition()
            .duration(300)
            .attr("stroke", "#333")
            .attr("d", d => {
                const series = d.days.map(day => ({
                    day: day.day,
                    value: mode === "max" ? day.max : day.min
                }));
                return line(series);
            });
    }

    update();

})();



