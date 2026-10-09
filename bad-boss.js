const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const series = [
  {
    name: "Part 1",
    className: "part1",
    values: [1.26875, 5.42, -5.45558, 1.93192, -6.13592, -10.38307, -14.4583, -5.09452, 6.81553, 5.5274, -2.50337, -3.48054],
  },
  {
    name: "Part 2",
    className: "part2",
    values: [1.26875, 5.42, -6.95558, 0.43192, -1.27608, -7.17453, -12.36781, 5.00016, 22.24667, 27.51934, 8.48583, 3.41278],
  },
];

const chart = document.querySelector("#monthly-chart");
const svgNS = "http://www.w3.org/2000/svg";

function svgElement(name, attrs = {}) {
  const element = document.createElementNS(svgNS, name);
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function formatValue(value) {
  const sign = value < 0 ? "−" : "";
  return `${sign}€${Math.abs(value).toFixed(1)}k`;
}

function renderChart() {
  if (!chart) return;
  chart.replaceChildren();

  const width = Math.max(chart.clientWidth, 520);
  const height = chart.clientHeight || 310;
  const margin = { top: 18, right: 18, bottom: 40, left: 48 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const min = -20;
  const max = 30;
  const x = (index) => margin.left + (plotWidth * index) / (months.length - 1);
  const y = (value) => margin.top + ((max - value) / (max - min)) * plotHeight;

  const svg = svgElement("svg", { viewBox: `0 0 ${width} ${height}`, "aria-hidden": "true" });
  const ticks = [-20, -10, 0, 10, 20, 30];

  ticks.forEach((tick) => {
    const tickY = y(tick);
    svg.appendChild(svgElement("line", {
      x1: margin.left,
      x2: width - margin.right,
      y1: tickY,
      y2: tickY,
      class: tick === 0 ? "chart-zero" : "chart-grid",
    }));
    const label = svgElement("text", { x: margin.left - 9, y: tickY + 4, "text-anchor": "end", class: "chart-axis-label" });
    label.textContent = tick === 0 ? "€0" : `${tick}`;
    svg.appendChild(label);
  });

  months.forEach((month, index) => {
    const label = svgElement("text", { x: x(index), y: height - 13, "text-anchor": "middle", class: "chart-axis-label" });
    label.textContent = month;
    svg.appendChild(label);
  });

  const tooltip = svgElement("g", { class: "chart-tooltip", visibility: "hidden" });
  const tooltipBox = svgElement("rect", { width: 105, height: 26 });
  const tooltipText = svgElement("text", { x: 8, y: 17 });
  tooltip.append(tooltipBox, tooltipText);

  function showTooltip(pointX, pointY, text) {
    const tooltipX = Math.min(Math.max(pointX - 52, margin.left), width - margin.right - 105);
    const tooltipY = Math.max(pointY - 38, margin.top);
    tooltip.setAttribute("transform", `translate(${tooltipX} ${tooltipY})`);
    tooltipText.textContent = text;
    tooltip.setAttribute("visibility", "visible");
  }

  function hideTooltip() {
    tooltip.setAttribute("visibility", "hidden");
  }

  series.forEach((item) => {
    const points = item.values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
    svg.appendChild(svgElement("polyline", { points, class: `chart-path ${item.className}` }));

    item.values.forEach((value, index) => {
      const point = svgElement("circle", {
        cx: x(index),
        cy: y(value),
        r: 5,
        class: `chart-point ${item.className}`,
        tabindex: "0",
        role: "button",
        "aria-label": `${item.name}, ${months[index]}: ${formatValue(value)}`,
      });
      const reveal = () => showTooltip(x(index), y(value), `${months[index]} · ${formatValue(value)}`);
      point.addEventListener("mouseenter", reveal);
      point.addEventListener("focus", reveal);
      point.addEventListener("mouseleave", hideTooltip);
      point.addEventListener("blur", hideTooltip);
      svg.appendChild(point);
    });
  });

  svg.appendChild(tooltip);
  chart.appendChild(svg);
}

renderChart();

let resizeTimer;
window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(renderChart, 120);
});
