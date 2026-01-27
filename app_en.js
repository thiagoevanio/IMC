import { WHO_BMI_LMS } from "./who_bmi_lms.js";

/* =========================
   Helpers
========================= */
const round = (n, d = 2) => Number.isFinite(n) ? Number(n).toFixed(d) : "—";
const cmToM = (cm) => cm / 100;
const cmToIn = (cm) => cm / 2.54;
const log10 = (x) => Math.log(x) / Math.LN10;

const showError = (id, show) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle("hidden", !show);
};

const setResult = (id, html) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = html;
  
  // UX Mobile: Scroll to result
  setTimeout(() => {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
};

const clamp = (x, min, max) => Math.max(min, Math.min(max, x));

/* Normal CDF via erf approximation */
function erf(x) {
  // Abramowitz & Stegun 7.1.26
  const sign = x < 0 ? -1 : 1;
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const ax = Math.abs(x);
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5*t + a4)*t + a3)*t + a2)*t + a1)*t) * Math.exp(-ax*ax);
  return sign * y;
}
const normCdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

/* =========================
   Adult BMI
========================= */
const bmiCategoryEn = (bmi) => {
  if (!Number.isFinite(bmi)) return "—";
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal weight";
  if (bmi < 30) return "Overweight";
  return "Obesity";
};

const bmiForm = document.getElementById("bmi-form");
if (bmiForm) {
  bmiForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const hCm = Number(data.get("heightCm"));
    const wKg = Number(data.get("weightKg"));

    if (!(hCm > 0) || !(wKg > 0)) {
      showError("bmi-error", true);
      return;
    }
    showError("bmi-error", false);

    const h = cmToM(hCm);
    const bmi = wKg / (h * h);

    setResult("bmi-result", `
      <div class="space-y-2">
        <p class="text-4xl font-extrabold text-emerald-600">${round(bmi, 1)}</p>
        <p class="text-slate-800"><strong>Category:</strong> ${bmiCategoryEn(bmi)}</p>
        <p class="text-xs text-slate-500">
          BMI is a screening tool. For body composition, consider Body Fat % as well.
        </p>
      </div>
    `);
  });
}

/* =========================
   Protein
========================= */
const proteinRanges = {
  // Common educational ranges
  sed: { min: 0.8, max: 1.0, label: "Sedentary / General Health" },
  cut: { min: 1.6, max: 2.2, label: "Fat Loss (preserve muscle)" },
  gain:{ min: 1.6, max: 2.2, label: "Hypertrophy (muscle gain)" },
  end: { min: 1.2, max: 1.8, label: "Endurance (run/bike)" },
};

const proteinForm = document.getElementById("protein-form");
if (proteinForm) {
  proteinForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const wKg = Number(data.get("weightKg"));
    const goal = String(data.get("goal"));
    const cfg = proteinRanges[goal];

    if (!(wKg > 0) || !cfg) {
      showError("protein-error", true);
      return;
    }
    showError("protein-error", false);

    const minG = wKg * cfg.min;
    const maxG = wKg * cfg.max;

    const perMeal3Min = minG / 3, perMeal3Max = maxG / 3;
    const perMeal4Min = minG / 4, perMeal4Max = maxG / 4;

    setResult("protein-result", `
      <div class="space-y-3">
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p class="text-xs uppercase font-extrabold text-emerald-800">Estimated Range</p>
          <p class="text-3xl font-extrabold text-emerald-700">
            ${round(minG, 0)}–${round(maxG, 0)} <span class="text-base font-semibold text-emerald-900/70">g/day</span>
          </p>
          <p class="text-sm text-emerald-900/70 mt-1"><strong>Goal:</strong> ${cfg.label}</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p class="text-xs uppercase font-bold text-slate-500">Splitting into 3 meals</p>
            <p class="text-lg font-bold text-slate-800">${round(perMeal3Min, 0)}–${round(perMeal3Max, 0)} g/meal</p>
          </div>
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p class="text-xs uppercase font-bold text-slate-500">Splitting into 4 meals</p>
            <p class="text-lg font-bold text-slate-800">${round(perMeal4Min, 0)}–${round(perMeal4Max, 0)} g/meal</p>
          </div>
        </div>

        <p class="text-xs text-slate-500">
          Tip: Needs vary by weight, intensity, calories, and preference. Use this as a starting point.
        </p>
      </div>
    `);
  });
}

/* =========================
   BMR and TDEE
========================= */
const bmrMifflin = ({ sex, age, heightCm, weightKg }) => {
  const s = sex === "male" ? 5 : -161;
  return (10 * weightKg) + (6.25 * heightCm) - (5 * age) + s;
};

const bmrForm = document.getElementById("bmr-form");
if (bmrForm) {
  bmrForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.target);

    const payload = {
      sex: String(data.get("sex")),
      age: Number(data.get("age")),
      heightCm: Number(data.get("heightCm")),
      weightKg: Number(data.get("weightKg")),
    };

    if (!(payload.age > 0) || !(payload.heightCm > 0) || !(payload.weightKg > 0)) {
      showError("bmr-error", true);
      return;
    }
    showError("bmr-error", false);

    const bmr = bmrMifflin(payload);

    setResult("bmr-result", `
      <div class="space-y-2">
        <p class="text-4xl font-extrabold text-emerald-600">
          ${round(bmr, 0)} <span class="text-base font-semibold text-slate-600">kcal/day</span>
        </p>
        <p class="text-slate-700"><strong>BMR</strong> is the estimated energy spent at rest.</p>
        <p class="text-xs text-slate-500">To estimate daily total, use TDEE (BMR × activity).</p>
      </div>
    `);
  });
}

const tdeeForm = document.getElementById("tdee-form");
if (tdeeForm) {
  tdeeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.target);

    const payload = {
      sex: String(data.get("sex")),
      age: Number(data.get("age")),
      heightCm: Number(data.get("heightCm")),
      weightKg: Number(data.get("weightKg")),
    };
    const activity = Number(data.get("activity"));

    if (!(payload.age > 0) || !(payload.heightCm > 0) || !(payload.weightKg > 0) || !(activity > 0)) {
      showError("tdee-error", true);
      return;
    }
    showError("tdee-error", false);

    const bmr = bmrMifflin(payload);
    const tdee = bmr * activity;

    const cutMin = tdee * 0.80;
    const cutMax = tdee * 0.90;
    const gainMin = tdee * 1.05;
    const gainMax = tdee * 1.15;

    setResult("tdee-result", `
      <div class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p class="text-xs uppercase font-bold text-slate-500">BMR (Rest)</p>
            <p class="text-2xl font-extrabold text-slate-800">${round(bmr, 0)} <span class="text-sm font-normal text-slate-500">kcal/day</span></p>
          </div>
          <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p class="text-xs uppercase font-extrabold text-emerald-800">TDEE (Maintenance)</p>
            <p class="text-2xl font-extrabold text-emerald-700">${round(tdee, 0)} <span class="text-sm font-normal text-emerald-700/80">kcal/day</span></p>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-4">
          <p class="text-sm font-bold text-slate-800 mb-2">Common Ranges</p>
          <ul class="text-sm text-slate-600 space-y-1">
            <li><strong>Weight Loss (−10% to −20%)</strong>: ~${round(cutMin,0)}–${round(cutMax,0)} kcal/day</li>
            <li><strong>Weight Gain (+5% to +15%)</strong>: ~${round(gainMin,0)}–${round(gainMax,0)} kcal/day</li>
          </ul>
        </div>

        <p class="text-xs text-slate-500">
          TDEE is an estimate. Track your weight trend and adjust over time.
        </p>
      </div>
    `);
  });
}

/* =========================
   Body Fat (US Navy)
========================= */
const bfForm = document.getElementById("bf-form");
if (bfForm) {
  const hipWrapper = bfForm.querySelector("[data-female-only]");
  const sexSelect = bfForm.querySelector('select[name="sex"]');

  const syncHipVisibility = () => {
    const isFemale = sexSelect.value === "female";
    hipWrapper.style.display = isFemale ? "" : "none";
    const hipInput = hipWrapper.querySelector("input");
    hipInput.required = isFemale;
    if (!isFemale) hipInput.value = "";
  };

  sexSelect.addEventListener("change", syncHipVisibility);
  syncHipVisibility();

  bfForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.target);

    const sex = String(data.get("sex"));
    const heightCm = Number(data.get("heightCm"));
    const neckCm = Number(data.get("neckCm"));
    const waistCm = Number(data.get("waistCm"));
    const hipCm = Number(data.get("hipCm"));

    if (!(heightCm > 0) || !(neckCm > 0) || !(waistCm > 0) || (sex === "female" && !(hipCm > 0))) {
      showError("bf-error", true);
      return;
    }

    // Convert cm to inches
    const h = cmToIn(heightCm);
    const neck = cmToIn(neckCm);
    const waist = cmToIn(waistCm);
    const hip = cmToIn(hipCm);

    let bf;
    if (sex === "male") {
      const x = waist - neck;
      if (x <= 0) { showError("bf-error", true); return; }
      bf = 495 / (1.0324 - 0.19077 * log10(x) + 0.15456 * log10(h)) - 450;
    } else {
      const x = waist + hip - neck;
      if (x <= 0) { showError("bf-error", true); return; }
      bf = 495 / (1.29579 - 0.35004 * log10(x) + 0.22100 * log10(h)) - 450;
    }

    if (!Number.isFinite(bf)) {
      showError("bf-error", true);
      return;
    }
    showError("bf-error", false);

    bf = clamp(bf, 0, 75);

    setResult("bf-result", `
      <div class="space-y-2">
        <p class="text-4xl font-extrabold text-emerald-600">${round(bf, 1)}%</p>
        <p class="text-slate-700">Estimated Body Fat % (US Navy Method).</p>
        <p class="text-xs text-slate-500">Results vary depending on measurement technique.</p>
      </div>
    `);
  });
}

/* =========================
   Ideal Weight
========================= */
const iwForm = document.getElementById("iw-form");
if (iwForm) {
  const idealWeight = ({ sex, heightCm }) => {
    const inches = cmToIn(heightCm);
    const over60 = Math.max(0, inches - 60);

    const devine = sex === "male" ? (50 + 2.3 * over60) : (45.5 + 2.3 * over60);
    const robinson = sex === "male" ? (52 + 1.9 * over60) : (49 + 1.7 * over60);
    const miller = sex === "male" ? (56.2 + 1.41 * over60) : (53.1 + 1.36 * over60);

    return { devine, robinson, miller };
  };

  iwForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.target);

    const payload = {
      sex: String(data.get("sex")),
      heightCm: Number(data.get("heightCm")),
    };

    if (!(payload.heightCm > 0)) {
      showError("iw-error", true);
      return;
    }
    showError("iw-error", false);

    const { devine, robinson, miller } = idealWeight(payload);

    setResult("iw-result", `
      <div class="space-y-3">
        <ul class="space-y-2">
          <li class="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span class="font-semibold text-slate-700">Devine</span>
            <span class="font-extrabold text-emerald-700">${round(devine, 1)} kg</span>
          </li>
          <li class="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span class="font-semibold text-slate-700">Robinson</span>
            <span class="font-extrabold text-emerald-700">${round(robinson, 1)} kg</span>
          </li>
          <li class="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span class="font-semibold text-slate-700">Miller</span>
            <span class="font-extrabold text-emerald-700">${round(miller, 1)} kg</span>
          </li>
        </ul>
        <p class="text-xs text-slate-500">Reference estimates only. Realistic goals depend on body composition and health.</p>
      </div>
    `);
  });
}

/* =========================
   Child BMI (WHO LMS)
========================= */
function ageMonthsDecimal(dob, measureDate) {
  const ms = measureDate.getTime() - dob.getTime();
  const days = ms / (1000 * 60 * 60 * 24);
  return days / 30.4375;
}

function lmsForMonth(sex, month) {
  const arr = sex === "male" ? WHO_BMI_LMS.male : WHO_BMI_LMS.female;
  return arr[month] || null;
}

function interpolateLms(sex, m) {
  const minM = 24, maxM = 228;
  if (m < minM || m > maxM) return null;

  const lo = clamp(Math.floor(m), minM, maxM);
  const hi = clamp(Math.ceil(m), minM, maxM);

  const a = lmsForMonth(sex, lo);
  const b = lmsForMonth(sex, hi);
  if (!a || !b) return null;

  if (lo === hi) return { L: a[0], M: a[1], S: a[2], month: lo };

  const t = (m - lo) / (hi - lo);
  const L = a[0] + (b[0] - a[0]) * t;
  const M = a[1] + (b[1] - a[1]) * t;
  const S = a[2] + (b[2] - a[2]) * t;

  return { L, M, S, month: m };
}

function zFromLms(bmi, L, M, S) {
  if (!Number.isFinite(bmi) || !Number.isFinite(L) || !Number.isFinite(M) || !Number.isFinite(S)) return NaN;
  if (bmi <= 0 || M <= 0 || S <= 0) return NaN;
  if (Math.abs(L) < 1e-9) return Math.log(bmi / M) / S;
  return (Math.pow(bmi / M, L) - 1) / (L * S);
}

function childClassEn(z, ageMonths) {
  // WHO cut-offs:
  // 5-19y: Overweight > +1, Obesity > +2, Thinness < -2, Severe Thinness < -3
  // 0-5y: Overweight > +2, Obesity > +3
  const isUnder5 = ageMonths <= 60;
  const overweight = isUnder5 ? 2 : 1;
  const obesity = isUnder5 ? 3 : 2;

  if (z < -3) return "Severe thinness (z < -3)";
  if (z < -2) return "Thinness (z < -2)";
  if (z > obesity) return `Obesity (z > +${obesity})`;
  if (z > overweight) return `Overweight (z > +${overweight})`;
  return "Normal weight / Expected";
}

const childMeasure = document.getElementById("child-measure-date");
if (childMeasure) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  childMeasure.value = `${yyyy}-${mm}-${dd}`;
}

const bmiChildForm = document.getElementById("bmi-child-form");
if (bmiChildForm) {
  bmiChildForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.target);

    const sex = String(data.get("sex"));
    const dobStr = String(data.get("dob"));
    const mdStr = String(data.get("measureDate"));
    const hCm = Number(data.get("heightCm"));
    const wKg = Number(data.get("weightKg"));

    const dob = new Date(dobStr);
    const md = new Date(mdStr);

    if (!dobStr || !mdStr || !(hCm > 0) || !(wKg > 0) || !(md > dob)) {
      showError("bmi-child-error", true);
      return;
    }

    const months = ageMonthsDecimal(dob, md);

    if (!(months >= 24 && months <= 228)) {
      showError("bmi-child-error", true);
      return;
    }
    showError("bmi-child-error", false);

    const h = cmToM(hCm);
    const bmi = wKg / (h * h);

    const lms = interpolateLms(sex, months);
    if (!lms) {
      showError("bmi-child-error", true);
      return;
    }

    const z = zFromLms(bmi, lms.L, lms.M, lms.S);
    const pct = normCdf(z) * 100;

    const years = months / 12;

    setResult("bmi-child-result", `
      <div class="space-y-3">
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p class="text-xs uppercase font-extrabold text-emerald-800">Child BMI (WHO)</p>
          <p class="text-3xl font-extrabold text-emerald-700">${round(bmi, 1)} <span class="text-base font-semibold text-emerald-900/70">kg/m²</span></p>
          <p class="text-sm text-emerald-900/70 mt-1">
            <strong>Age:</strong> ${round(years, 2)} years (${round(months, 1)} months)
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <p class="text-xs uppercase font-bold text-slate-500">z-score</p>
            <p class="text-2xl font-extrabold text-slate-800">${round(z, 2)}</p>
          </div>
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <p class="text-xs uppercase font-bold text-slate-500">Percentile (approx.)</p>
            <p class="text-2xl font-extrabold text-slate-800">${round(pct, 1)}%</p>
          </div>
        </div>

        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p class="text-sm font-bold text-slate-800">Classification</p>
          <p class="text-slate-700">${childClassEn(z, months)}</p>
          <p class="text-xs text-slate-500 mt-2">
            Reminder: percentile/z-score is a statistical reference. For clinical decisions, see a pediatrician.
          </p>
        </div>
      </div>
    `);
  });
}

/* =========================
   Due Date (DPP)
========================= */
function parseDateInput(v) {
  const d = new Date(String(v));
  return Number.isFinite(d.getTime()) ? d : null;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d) {
  // US format or locale string
  return d.toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
}

const dueForm = document.getElementById("due-date-form");
if (dueForm) {
  dueForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.target);

    const lmp = parseDateInput(data.get("lmp"));
    const cycle = Number(data.get("cycle"));

    if (!lmp || !(cycle >= 20 && cycle <= 45)) {
      showError("due-date-error", true);
      return;
    }
    showError("due-date-error", false);

    const adjust = cycle - 28;
    const dpp = addDays(lmp, 280 + adjust);

    const today = new Date();
    const daysPreg = (today.getTime() - lmp.getTime()) / (1000*60*60*24);
    const weeks = Math.floor(daysPreg / 7);
    const days = Math.floor(daysPreg % 7);

    const trimester = weeks < 14 ? "1st trimester" : (weeks < 28 ? "2nd trimester" : "3rd trimester");

    const w12 = addDays(lmp, 12*7);
    const w20 = addDays(lmp, 20*7);
    const w37 = addDays(lmp, 37*7);

    setResult("due-date-result", `
      <div class="space-y-3">
        <div class="bg-pink-50 border border-pink-200 rounded-xl p-4">
          <p class="text-xs uppercase font-extrabold text-pink-800">Estimated Due Date</p>
          <p class="text-3xl font-extrabold text-pink-700">${formatDate(dpp)}</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <p class="text-xs uppercase font-bold text-slate-500">Gestational Age</p>
            <p class="text-xl font-extrabold text-slate-800">${weeks} weeks, ${days} days</p>
            <p class="text-sm text-slate-600">${trimester}</p>
          </div>
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <p class="text-xs uppercase font-bold text-slate-500">Cycle Length Used</p>
            <p class="text-xl font-extrabold text-slate-800">${cycle} days</p>
            <p class="text-sm text-slate-600">Adjustment: ${adjust >= 0 ? "+" : ""}${adjust} day(s)</p>
          </div>
        </div>

        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p class="text-sm font-bold text-slate-800 mb-2">Milestones (approx.)</p>
          <ul class="text-sm text-slate-700 space-y-1">
            <li><strong>12 weeks:</strong> ${formatDate(w12)}</li>
            <li><strong>20 weeks:</strong> ${formatDate(w20)}</li>
            <li><strong>37 weeks:</strong> ${formatDate(w37)} (Full term starts)</li>
          </ul>
          <p class="text-xs text-slate-500 mt-2">
            Approximate dates — consult your obstetrician for individual interpretation.
          </p>
        </div>
      </div>
    `);
  });
}

/* =========================
   Mobile Menu
========================= */
const btn = document.getElementById("mobile-menu-btn");
const menu = document.getElementById("mobile-menu");

if (btn && menu) {
  btn.addEventListener("click", () => {
    const isHidden = menu.classList.toggle("hidden");
    btn.setAttribute("aria-expanded", String(!isHidden));
  });

  const links = menu.querySelectorAll(".mobile-link");
  links.forEach(link => {
    link.addEventListener("click", () => {
      menu.classList.add("hidden");
      btn.setAttribute("aria-expanded", "false");
    });
  });
}