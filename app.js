const tooltip = d3.select("#tooltip");

const state = {
  rawData: [],
  filteredData: [],
  selectedData: [],
  brushSelection: null
};

const colorScale = d3.scaleOrdinal()
  .domain(["American", "European", "Japanese"])
  .range(["#1f77b4", "#2ca02c", "#d62728"]);

const sizeScale = d3.scaleSqrt().range([4, 12]);

d3.csv("data/a1-cars.csv").then(data => {
  data.forEach(d => {
    d.MPG = +d.MPG;
    d.Cylinders = +d.Cylinders;
    d.Displacement = +d.Displacement;
    d.Horsepower = +d.Horsepower;
    d.Weight = +d.Weight;
    d.Acceleration = +d.Acceleration;
    d["Model Year"] = +d["Model Year"];
  });

  state.rawData = data;
  sizeScale.domain(d3.extent(data, d => d.Horsepower));

  d3.select("#originFilter").on("change", applyFilters);
  d3.select("#cylFilter").on("change", applyFilters);
  d3.select("#resetBrush").on("click", () => {
    state.brushSelection = null;
    state.selectedData = [];
    renderAll();
  });

  applyFilters();
});

function applyFilters() {
  const origin = d3.select("#originFilter").property("value");
  const cyl = d3.select("#cylFilter").property("value");

  state.filteredData = state.rawData.filter(d => {
    const originMatch = origin === "All" || d.Origin === origin;
    const cylMatch = cyl === "All" || d.Cylinders === +cyl;
    return originMatch && cylMatch;
  });

  state.brushSelection = null;
  state.selectedData = [];
  renderAll();
}

function getActiveData() {
  return state.selectedData.length > 0 ? state.selectedData : state.filteredData;
}

function renderAll() {
  d3.select("#scatter").html("");
  d3.select("#line").html("");
  d3.select("#bar").html("");
  d3.select("#box").html("");

  drawScatter(state.filteredData);
  drawLine(getActiveData());
  drawBar(getActiveData());
  drawBox(getActiveData());
}

function showTooltip(event, html) {
  tooltip
    .style("opacity", 1)
    .html(html)
    .style("left", `${event.pageX + 12}px`)
    .style("top", `${event.pageY - 20}px`);
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}

function drawScatter(data) {
  const margin = { top: 20, right: 30, bottom: 60, left: 70 };
  const width = 620 - margin.left - margin.right;
  const height = 420 - margin.top - margin.bottom;

  const svg = d3.select("#scatter")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Weight))
    .nice()
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain(d3.extent(data, d => d.MPG))
    .nice()
    .range([height, 0]);

  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  g.append("g")
    .call(d3.axisLeft(y));

  g.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 45)
    .attr("text-anchor", "middle")
    .text("Weight");

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text("MPG");

  const circles = g.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.Weight))
    .attr("cy", d => y(d.MPG))
    .attr("r", d => sizeScale(d.Horsepower))
    .attr("fill", d => colorScale(d.Origin))
    .attr("opacity", 0.75)
    .on("mouseover", function(event, d) {
      d3.select(this).classed("selected-point", true);
      showTooltip(event, `
        <strong>${d.Car}</strong><br>
        Origin: ${d.Origin}<br>
        Weight: ${d.Weight}<br>
        MPG: ${d.MPG}<br>
        Horsepower: ${d.Horsepower}
      `);
    })
    .on("mousemove", function(event) {
      tooltip
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY - 20}px`);
    })
    .on("mouseout", function() {
      d3.select(this).classed("selected-point", false);
      hideTooltip();
    });

  const brush = d3.brush()
    .extent([[0, 0], [width, height]])
    .on("brush end", brushed);

  g.append("g")
    .attr("class", "brush")
    .call(brush);

  function brushed(event) {
    const selection = event.selection;

    if (!selection) {
      state.selectedData = [];
      drawLinkedCharts();
      return;
    }

    const [[x0, y0], [x1, y1]] = selection;

    state.selectedData = data.filter(d => {
      const cx = x(d.Weight);
      const cy = y(d.MPG);
      return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
    });

    drawLinkedCharts();
  }

  function drawLinkedCharts() {
    d3.select("#line").html("");
    d3.select("#bar").html("");
    d3.select("#box").html("");
    drawLine(getActiveData());
    drawBar(getActiveData());
    drawBox(getActiveData());
  }

  const legend = g.append("g")
    .attr("transform", `translate(${width - 120}, 10)`);

  ["American", "European", "Japanese"].forEach((origin, i) => {
    const row = legend.append("g").attr("transform", `translate(0, ${i * 22})`);
    row.append("circle").attr("r", 6).attr("fill", colorScale(origin));
    row.append("text").attr("x", 12).attr("y", 4).style("font-size", "12px").text(origin);
  });
}

function drawLine(data) {
  const margin = { top: 20, right: 30, bottom: 60, left: 70 };
  const width = 620 - margin.left - margin.right;
  const height = 420 - margin.top - margin.bottom;

  const svg = d3.select("#line")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const grouped = d3.rollups(
    data,
    v => d3.mean(v, d => d.MPG),
    d => d["Model Year"]
  ).map(([year, avgMPG]) => ({ year, avgMPG }))
   .sort((a, b) => a.year - b.year);

  const x = d3.scaleLinear()
    .domain(d3.extent(grouped, d => d.year))
    .nice()
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(grouped, d => d.avgMPG) || 1])
    .nice()
    .range([height, 0]);

  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  g.append("g")
    .call(d3.axisLeft(y));

  g.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 45)
    .attr("text-anchor", "middle")
    .text("Model Year");

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text("Average MPG");

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.avgMPG));

  g.append("path")
    .datum(grouped)
    .attr("fill", "none")
    .attr("stroke", "#1f77b4")
    .attr("stroke-width", 3)
    .attr("d", line);

  g.selectAll("circle")
    .data(grouped)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.year))
    .attr("cy", d => y(d.avgMPG))
    .attr("r", 5)
    .attr("fill", "#d62728")
    .on("mouseover", function(event, d) {
      showTooltip(event, `Model Year: ${d.year}<br>Average MPG: ${d.avgMPG.toFixed(2)}`);
    })
    .on("mousemove", function(event) {
      tooltip
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY - 20}px`);
    })
    .on("mouseout", hideTooltip);
}

function drawBar(data) {
  const margin = { top: 20, right: 30, bottom: 60, left: 70 };
  const width = 620 - margin.left - margin.right;
  const height = 420 - margin.top - margin.bottom;

  const svg = d3.select("#bar")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const grouped = d3.rollups(
    data,
    v => d3.mean(v, d => d.MPG),
    d => d.Origin
  ).map(([origin, avgMPG]) => ({ origin, avgMPG }));

  const x = d3.scaleBand()
    .domain(grouped.map(d => d.origin))
    .range([0, width])
    .padding(0.35);

  const y = d3.scaleLinear()
    .domain([0, d3.max(grouped, d => d.avgMPG) || 1])
    .nice()
    .range([height, 0]);

  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  g.append("g")
    .call(d3.axisLeft(y));

  g.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 45)
    .attr("text-anchor", "middle")
    .text("Origin");

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text("Average MPG");

  g.selectAll("rect")
    .data(grouped)
    .enter()
    .append("rect")
    .attr("x", d => x(d.origin))
    .attr("y", d => y(d.avgMPG))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(d.avgMPG))
    .attr("fill", d => colorScale(d.origin))
    .on("mouseover", function(event, d) {
      showTooltip(event, `Origin: ${d.origin}<br>Average MPG: ${d.avgMPG.toFixed(2)}`);
    })
    .on("mousemove", function(event) {
      tooltip
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY - 20}px`);
    })
    .on("mouseout", hideTooltip);
}

function drawBox(data) {
  const margin = { top: 20, right: 30, bottom: 60, left: 70 };
  const width = 620 - margin.left - margin.right;
  const height = 420 - margin.top - margin.bottom;

  const svg = d3.select("#box")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const origins = ["American", "European", "Japanese"].filter(origin =>
    data.some(d => d.Origin === origin)
  );

  const grouped = origins.map(origin => {
    const values = data
      .filter(d => d.Origin === origin)
      .map(d => d.MPG)
      .sort(d3.ascending);

    const q1 = d3.quantile(values, 0.25);
    const median = d3.quantile(values, 0.5);
    const q3 = d3.quantile(values, 0.75);
    const iqr = q3 - q1;
    const min = d3.max([d3.min(values), q1 - 1.5 * iqr]);
    const max = d3.min([d3.max(values), q3 + 1.5 * iqr]);

    return { origin, q1, median, q3, min, max };
  });

  const x = d3.scaleBand()
    .domain(origins)
    .range([0, width])
    .paddingInner(0.4)
    .paddingOuter(0.3);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.MPG) || 1])
    .nice()
    .range([height, 0]);

  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  g.append("g")
    .call(d3.axisLeft(y));

  g.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 45)
    .attr("text-anchor", "middle")
    .text("Origin");

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text("MPG");

  grouped.forEach((d) => {
    const center = x(d.origin) + x.bandwidth() / 2;
    const boxRectWidth = x.bandwidth() * 0.5;

    g.append("line")
      .attr("x1", center)
      .attr("x2", center)
      .attr("y1", y(d.min))
      .attr("y2", y(d.max))
      .attr("stroke", "black");

    g.append("rect")
      .attr("x", center - boxRectWidth / 2)
      .attr("y", y(d.q3))
      .attr("width", boxRectWidth)
      .attr("height", y(d.q1) - y(d.q3))
      .attr("fill", colorScale(d.origin))
      .attr("opacity", 0.45)
      .attr("stroke", "black")
      .on("mouseover", function(event) {
        showTooltip(event, `
          Origin: ${d.origin}<br>
          Q1: ${d.q1.toFixed(2)}<br>
          Median: ${d.median.toFixed(2)}<br>
          Q3: ${d.q3.toFixed(2)}
        `);
      })
      .on("mousemove", function(event) {
        tooltip
          .style("left", `${event.pageX + 12}px`)
          .style("top", `${event.pageY - 20}px`);
      })
      .on("mouseout", hideTooltip);

    g.append("line")
      .attr("x1", center - boxRectWidth / 2)
      .attr("x2", center + boxRectWidth / 2)
      .attr("y1", y(d.median))
      .attr("y2", y(d.median))
      .attr("stroke", "black")
      .attr("stroke-width", 2);

    g.append("line")
      .attr("x1", center - boxRectWidth / 3)
      .attr("x2", center + boxRectWidth / 3)
      .attr("y1", y(d.min))
      .attr("y2", y(d.min))
      .attr("stroke", "black");

    g.append("line")
      .attr("x1", center - boxRectWidth / 3)
      .attr("x2", center + boxRectWidth / 3)
      .attr("y1", y(d.max))
      .attr("y2", y(d.max))
      .attr("stroke", "black");
  });
}