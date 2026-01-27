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
  
  // UX Mobile: Rola suavemente até o resultado para que o usuário veja
  // especialmente útil em telas pequenas com teclado aberto
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
   Adult IMC
========================= */
const bmiCategoryPt = (bmi) => {
  if (!Number.isFinite(bmi)) return "—";
  if (bmi < 18.5) return "Abaixo do peso";
  if (bmi < 25) return "Peso adequado";
  if (bmi < 30) return "Sobrepeso";
  return "Obesidade";
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
        <p class="text-slate-800"><strong>Classificação:</strong> ${bmiCategoryPt(bmi)}</p>
        <p class="text-xs text-slate-500">
          O IMC é triagem. Para composição corporal, considere também % de gordura e medidas.
        </p>
      </div>
    `);
  });
}

/* =========================
   Proteína
========================= */
const proteinRanges = {
  // valores comuns na prática (faixas) — educacionais
  sed: { min: 0.8, max: 1.0, label: "Sedentário / saúde geral" },
  cut: { min: 1.6, max: 2.2, label: "Emagrecimento (preservar massa)" },
  gain:{ min: 1.6, max: 2.2, label: "Hipertrofia (ganho de massa)" },
  end: { min: 1.2, max: 1.8, label: "Resistência (endurance)" },
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
          <p class="text-xs uppercase font-extrabold text-emerald-800">Faixa estimada</p>
          <p class="text-3xl font-extrabold text-emerald-700">
            ${round(minG, 0)}–${round(maxG, 0)} <span class="text-base font-semibold text-emerald-900/70">g/dia</span>
          </p>
          <p class="text-sm text-emerald-900/70 mt-1"><strong>Objetivo:</strong> ${cfg.label}</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p class="text-xs uppercase font-bold text-slate-500">Dividindo em 3 refeições</p>
            <p class="text-lg font-bold text-slate-800">${round(perMeal3Min, 0)}–${round(perMeal3Max, 0)} g/refeição</p>
          </div>
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p class="text-xs uppercase font-bold text-slate-500">Dividindo em 4 refeições</p>
            <p class="text-lg font-bold text-slate-800">${round(perMeal4Min, 0)}–${round(perMeal4Max, 0)} g/refeição</p>
          </div>
        </div>

        <p class="text-xs text-slate-500">
          Dica: a faixa pode variar por peso, treino, calorias e preferências. Use como ponto de partida.
        </p>
      </div>
    `);
  });
}

/* =========================
   TMB e TDEE
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
          ${round(bmr, 0)} <span class="text-base font-semibold text-slate-600">kcal/dia</span>
        </p>
        <p class="text-slate-700"><strong>TMB</strong> é o gasto estimado em repouso.</p>
        <p class="text-xs text-slate-500">Para estimar o total diário, use o TDEE (TMB × atividade).</p>
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
            <p class="text-xs uppercase font-bold text-slate-500">TMB (repouso)</p>
            <p class="text-2xl font-extrabold text-slate-800">${round(bmr, 0)} <span class="text-sm font-normal text-slate-500">kcal/dia</span></p>
          </div>
          <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p class="text-xs uppercase font-extrabold text-emerald-800">TDEE (manutenção)</p>
            <p class="text-2xl font-extrabold text-emerald-700">${round(tdee, 0)} <span class="text-sm font-normal text-emerald-700/80">kcal/dia</span></p>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-4">
          <p class="text-sm font-bold text-slate-800 mb-2">Faixas comuns (educacionais)</p>
          <ul class="text-sm text-slate-600 space-y-1">
            <li><strong>Emagrecer (−10% a −20%)</strong>: ~${round(cutMin,0)}–${round(cutMax,0)} kcal/dia</li>
            <li><strong>Ganhar massa (+5% a +15%)</strong>: ~${round(gainMin,0)}–${round(gainMax,0)} kcal/dia</li>
          </ul>
        </div>

        <p class="text-xs text-slate-500">
          O TDEE é uma estimativa. Acompanhe evolução de peso/medidas e ajuste com o tempo.
        </p>
      </div>
    `);
  });
}

/* =========================
   % Gordura (US Navy) — corrigido: converter cm -> polegadas
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

    // converter para polegadas (fórmula original)
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
        <p class="text-slate-700">Estimativa de % de gordura (método Marinha dos EUA).</p>
        <p class="text-xs text-slate-500">Resultados podem variar conforme a técnica de medida.</p>
      </div>
    `);
  });
}

/* =========================
   Peso ideal (Devine, Robinson, Miller)
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
        <p class="text-xs text-slate-500">Estimativas de referência. Metas realistas dependem de composição corporal, saúde e objetivo.</p>
      </div>
    `);
  });
}

/* =========================
   IMC Infantil (OMS) — LMS
========================= */
function ageMonthsDecimal(dob, measureDate) {
  // diferença em dias / 30.4375 (média de dias por mês)
  const ms = measureDate.getTime() - dob.getTime();
  const days = ms / (1000 * 60 * 60 * 24);
  return days / 30.4375;
}

function lmsForMonth(sex, month) {
  const arr = sex === "male" ? WHO_BMI_LMS.male : WHO_BMI_LMS.female;
  return arr[month] || null; // [L,M,S]
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

function childClassPt(z, ageMonths) {
  // cut-offs OMS:
  // 2-5 anos: sobrepeso > +2, obesidade > +3; magreza < -2, magreza acentuada < -3
  // 5-19 anos: sobrepeso > +1, obesidade > +2; magreza < -2, magreza acentuada < -3
  const isUnder5 = ageMonths <= 60;
  const overweight = isUnder5 ? 2 : 1;
  const obesity = isUnder5 ? 3 : 2;

  if (z < -3) return "Magreza acentuada (z < -3)";
  if (z < -2) return "Magreza (z < -2)";
  if (z > obesity) return `Obesidade (z > +${obesity})`;
  if (z > overweight) return `Sobrepeso (z > +${overweight})`;
  return "Eutrofia / dentro do esperado";
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
          <p class="text-xs uppercase font-extrabold text-emerald-800">IMC infantil (OMS)</p>
          <p class="text-3xl font-extrabold text-emerald-700">${round(bmi, 1)} <span class="text-base font-semibold text-emerald-900/70">kg/m²</span></p>
          <p class="text-sm text-emerald-900/70 mt-1">
            <strong>Idade:</strong> ${round(years, 2)} anos (${round(months, 1)} meses)
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <p class="text-xs uppercase font-bold text-slate-500">z-score</p>
            <p class="text-2xl font-extrabold text-slate-800">${round(z, 2)}</p>
          </div>
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <p class="text-xs uppercase font-bold text-slate-500">Percentil (aprox.)</p>
            <p class="text-2xl font-extrabold text-slate-800">${round(pct, 1)}%</p>
          </div>
        </div>

        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p class="text-sm font-bold text-slate-800">Classificação (educacional)</p>
          <p class="text-slate-700">${childClassPt(z, months)}</p>
          <p class="text-xs text-slate-500 mt-2">
            Lembrete: percentil/z-score é referência estatística. Para decisão clínica, procure um(a) pediatra/nutricionista.
          </p>
        </div>
      </div>
    `);
  });
}

/* =========================
   DPP (Data provável do parto)
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

function formatDateBR(d) {
  return d.toLocaleDateString("pt-BR", { year:"numeric", month:"2-digit", day:"2-digit" });
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

    // Regra de Naegele ajustada: 280 dias + (ciclo-28)
    const adjust = cycle - 28;
    const dpp = addDays(lmp, 280 + adjust);

    const today = new Date();
    const daysPreg = (today.getTime() - lmp.getTime()) / (1000*60*60*24);
    const weeks = Math.floor(daysPreg / 7);
    const days = Math.floor(daysPreg % 7);

    const trimester = weeks < 14 ? "1º trimestre" : (weeks < 28 ? "2º trimestre" : "3º trimestre");

    // Marcos comuns
    const w12 = addDays(lmp, 12*7);
    const w20 = addDays(lmp, 20*7);
    const w37 = addDays(lmp, 37*7);

    setResult("due-date-result", `
      <div class="space-y-3">
        <div class="bg-pink-50 border border-pink-200 rounded-xl p-4">
          <p class="text-xs uppercase font-extrabold text-pink-800">Estimativa</p>
          <p class="text-3xl font-extrabold text-pink-700">${formatDateBR(dpp)}</p>
          <p class="text-sm text-pink-900/70 mt-1"><strong>DPP</strong> (data provável do parto)</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <p class="text-xs uppercase font-bold text-slate-500">Idade gestacional hoje</p>
            <p class="text-xl font-extrabold text-slate-800">${weeks} semanas e ${days} dias</p>
            <p class="text-sm text-slate-600">${trimester}</p>
          </div>
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <p class="text-xs uppercase font-bold text-slate-500">Ciclo considerado</p>
            <p class="text-xl font-extrabold text-slate-800">${cycle} dias</p>
            <p class="text-sm text-slate-600">Ajuste aplicado: ${adjust >= 0 ? "+" : ""}${adjust} dia(s)</p>
          </div>
        </div>

        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p class="text-sm font-bold text-slate-800 mb-2">Marcos (aprox.)</p>
          <ul class="text-sm text-slate-700 space-y-1">
            <li><strong>12 semanas:</strong> ${formatDateBR(w12)}</li>
            <li><strong>20 semanas:</strong> ${formatDateBR(w20)}</li>
            <li><strong>37 semanas:</strong> ${formatDateBR(w37)} (a termo inicial, em geral)</li>
          </ul>
          <p class="text-xs text-slate-500 mt-2">
            Datas aproximadas — converse com seu(sua) obstetra para interpretação individual.
          </p>
        </div>
      </div>
    `);
  });
}

/* =========================
   Menu Mobile
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