const FALLBACK_CONFIG = {
  new_graph: "f(x)=",
  "graph-properties": {
    valid_colors: [
      "red",
      "green",
      "blue",
      "yellow",
      "magenta",
      "cyan",
      "purple",
      "orange",
      "black",
      "white",
    ],
    valid_lines: ["solid", "dashed", "dotted"],
    valid_point_styles: ["point", "open", "cross"],
  },
};

const COLOR_SWATCH = {
  red: "#c74440",
  green: "#388c46",
  blue: "#2d70b3",
  yellow: "#c4a000",
  magenta: "#c22c8e",
  cyan: "#1aa3a3",
  purple: "#6042a6",
  orange: "#f97316",
  black: "#111111",
  white: "#f4f4f4",
};

const LATEX_FUNCS = [
  "arcsin",
  "arccos",
  "arctan",
  "sinh",
  "cosh",
  "tanh",
  "sin",
  "cos",
  "tan",
  "log",
  "ln",
  "exp",
  "min",
  "max",
];

let config = FALLBACK_CONFIG;
let equations = [];
let eqSeq = 0;

function colors() {
  return config["graph-properties"]?.valid_colors ?? FALLBACK_CONFIG["graph-properties"].valid_colors;
}

function allStyles() {
  const props = config["graph-properties"] ?? FALLBACK_CONFIG["graph-properties"];
  return [...(props.valid_lines ?? []), ...(props.valid_point_styles ?? [])];
}

function toLatex(expr) {
  if (!expr || expr.includes("\\")) return expr;
  let out = expr;
  for (const fn of LATEX_FUNCS) {
    out = out.replace(new RegExp(`\\b${fn}\\b`, "g"), `\\${fn}`);
  }
  return out
    .replace(/\bpi\b/g, "\\pi")
    .replace(/\btheta\b/g, "\\theta")
    .replace(/\balpha\b/g, "\\alpha")
    .replace(/\bbeta\b/g, "\\beta")
    .replace(/\bsqrt\(/g, "\\sqrt(");
}

function fieldValue(id) {
  return document.getElementById(id).value.trim();
}

function collectSettings() {
  const settings = [];
  const left = fieldValue("bound-left");
  const right = fieldValue("bound-right");
  const top = fieldValue("bound-top");
  const bottom = fieldValue("bound-bottom");
  if (left !== "") settings.push(`left=${left};`);
  if (right !== "") settings.push(`right=${right};`);
  if (top !== "") settings.push(`top=${top};`);
  if (bottom !== "") settings.push(`bottom=${bottom};`);

  const width = fieldValue("opt-width");
  const height = fieldValue("opt-height");
  if (width !== "") settings.push(`width=${width}`);
  if (height !== "") settings.push(`height=${height}`);

  if (document.getElementById("opt-grid").value === "false") {
    settings.push("grid=false");
  }

  if (document.getElementById("opt-degree").value === "degrees") {
    settings.push("degreeMode=degrees");
  }

  const defaultColor = document.getElementById("opt-default-color").value;
  if (defaultColor) settings.push(`defaultColor=${defaultColor}`);

  return settings;
}

function equationLine(eq, convertLatex) {
  const raw = eq.expression.trim();
  if (!raw || /=\s*$/.test(raw)) return "";
  const expr = convertLatex ? toLatex(raw) : raw;
  const parts = [];
  if (eq.restriction.trim()) parts.push(eq.restriction.trim());
  if (eq.color) parts.push(eq.color);
  if (eq.style && eq.style !== "solid" && eq.style !== "point") parts.push(eq.style);
  if (eq.hidden) parts.push("hidden");
  if (eq.label.trim()) parts.push(`label:${eq.label.trim()}`);
  return parts.length ? `${expr}|${parts.join("|")}` : expr;
}

function generateCode() {
  const convertLatex = document.getElementById("opt-latex").checked;
  const settings = collectSettings();
  const lines = equations.map((eq) => equationLine(eq, convertLatex)).filter(Boolean);
  const body = [];
  if (settings.length) {
    body.push(settings.join("\n"));
    body.push("---");
  }
  body.push(...lines);
  while (body.length && (body[body.length - 1] === "---" || body[body.length - 1] === "")) {
    body.pop();
  }
  const inner = body.join("\n");
  return "```desmos-graph\n" + (inner ? inner + "\n" : "") + "```";
}

function renderPreview() {
  document.getElementById("code-preview").textContent = generateCode();
}

function fillColorSelect(select) {
  select.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  select.appendChild(empty);
  for (const color of colors()) {
    const opt = document.createElement("option");
    opt.value = color;
    opt.textContent = color;
    select.appendChild(opt);
  }
}

function styleOptions(selected) {
  return allStyles()
    .map((style) => `<option value="${style}" ${style === selected ? "selected" : ""}>${style}</option>`)
    .join("");
}

function colorOptions(selected) {
  const items = [`<option value="" ${selected ? "" : "selected"}></option>`];
  for (const color of colors()) {
    items.push(`<option value="${color}" ${color === selected ? "selected" : ""}>${color}</option>`);
  }
  return items.join("");
}

function newEquation(partial = {}) {
  eqSeq += 1;
  return {
    id: eqSeq,
    expression: partial.expression ?? config.new_graph ?? "f(x)=",
    color: partial.color ?? "",
    style: partial.style ?? "solid",
    restriction: partial.restriction ?? "",
    hidden: Boolean(partial.hidden),
    label: partial.label ?? "",
  };
}

function readEquationFromCard(card) {
  const id = Number(card.dataset.id);
  const eq = equations.find((item) => item.id === id);
  if (!eq) return;
  eq.expression = card.querySelector(".eq-expr").value;
  eq.color = card.querySelector(".eq-color").value;
  eq.style = card.querySelector(".eq-style").value;
  eq.restriction = card.querySelector(".eq-rest").value;
  eq.hidden = card.querySelector(".eq-hidden").checked;
  eq.label = card.querySelector(".eq-label").value;
  card.style.borderLeftColor = COLOR_SWATCH[eq.color] || "#f97316";
  renderPreview();
}

function escapeAttr(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}

function renderEquations() {
  document.getElementById("equations").innerHTML = equations
    .map(
      (eq, index) => `
      <article class="eq-card" data-id="${eq.id}" style="border-left-color:${COLOR_SWATCH[eq.color] || "#f97316"}">
        <div class="eq-top">
          <strong>${index + 1}</strong>
          <button type="button" class="eq-remove" data-remove="${eq.id}" ${equations.length === 1 ? "disabled" : ""}>×</button>
        </div>
        <div class="eq-grid">
          <label class="span">Equation <input class="eq-expr" value="${escapeAttr(eq.expression)}" /></label>
          <label>Color <select class="eq-color">${colorOptions(eq.color)}</select></label>
          <label>Style <select class="eq-style">${styleOptions(eq.style)}</select></label>
          <label>Restriction <input class="eq-rest" value="${escapeAttr(eq.restriction)}" /></label>
          <label>Label <input class="eq-label" value="${escapeAttr(eq.label)}" /></label>
        </div>
        <label class="check">
          <input type="checkbox" class="eq-hidden" ${eq.hidden ? "checked" : ""} />
          Hidden
        </label>
      </article>`
    )
    .join("");
}

async function copyCode() {
  const status = document.getElementById("copy-status");
  try {
    await navigator.clipboard.writeText(generateCode());
    status.textContent = "Copied";
    setTimeout(() => {
      status.textContent = "";
    }, 1600);
  } catch {
    status.textContent = "Error";
  }
}

function resetAll() {
  document.getElementById("bound-left").value = "-10";
  document.getElementById("bound-right").value = "10";
  document.getElementById("bound-top").value = "10";
  document.getElementById("bound-bottom").value = "-10";
  document.getElementById("opt-width").value = "";
  document.getElementById("opt-height").value = "";
  document.getElementById("opt-grid").value = "true";
  document.getElementById("opt-degree").value = "radians";
  document.getElementById("opt-default-color").value = "";
  document.getElementById("opt-latex").checked = true;
  equations = [newEquation()];
  renderEquations();
  renderPreview();
  document.getElementById("copy-status").textContent = "";
}

function bindEvents() {
  document.getElementById("wizard").addEventListener("submit", (event) => event.preventDefault());
  document.getElementById("wizard").addEventListener("input", renderPreview);
  document.getElementById("wizard").addEventListener("change", renderPreview);
  document.getElementById("opt-latex").addEventListener("change", renderPreview);
  document.getElementById("copy-btn").addEventListener("click", copyCode);
  document.getElementById("reset-btn").addEventListener("click", resetAll);
  document.getElementById("add-equation").addEventListener("click", () => {
    equations.push(newEquation());
    renderEquations();
    renderPreview();
  });
  document.getElementById("equations").addEventListener("input", (event) => {
    const card = event.target.closest(".eq-card");
    if (card) readEquationFromCard(card);
  });
  document.getElementById("equations").addEventListener("change", (event) => {
    const card = event.target.closest(".eq-card");
    if (card) readEquationFromCard(card);
  });
  document.getElementById("equations").addEventListener("click", (event) => {
    const id = event.target.dataset.remove;
    if (!id || equations.length === 1) return;
    equations = equations.filter((eq) => eq.id !== Number(id));
    renderEquations();
    renderPreview();
  });
}

async function loadConfig() {
  try {
    const res = await fetch("./commands.json");
    if (res.ok) {
      const data = await res.json();
      config = {
        ...FALLBACK_CONFIG,
        ...data,
        "graph-properties": {
          ...FALLBACK_CONFIG["graph-properties"],
          ...(data["graph-properties"] ?? {}),
        },
      };
    }
  } catch {
    config = FALLBACK_CONFIG;
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  await loadConfig();
  fillColorSelect(document.getElementById("opt-default-color"));
  equations = [newEquation()];
  bindEvents();
  renderEquations();
  renderPreview();
});
