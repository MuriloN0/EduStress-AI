const groups = {
  Psicológicos: {
    anxiety_level: 'Ansiedade', self_esteem: 'Autoestima',
    mental_health_history: 'Histórico de saúde mental', depression: 'Depressão',
  },
  Fisiológicos: {
    headache: 'Dor de cabeça', blood_pressure: 'Pressão arterial (categoria)',
    sleep_quality: 'Qualidade do sono', breathing_problem: 'Problemas respiratórios',
  },
  Ambientais: {
    noise_level: 'Nível de ruído', living_conditions: 'Condições de moradia',
    safety: 'Segurança', basic_needs: 'Necessidades básicas',
  },
  Acadêmicos: {
    academic_performance: 'Desempenho acadêmico', study_load: 'Carga de estudos',
    teacher_student_relationship: 'Relação com professores',
    future_career_concerns: 'Preocupação com a carreira',
  },
  Sociais: {
    social_support: 'Apoio social', peer_pressure: 'Pressão dos colegas',
    extracurricular_activities: 'Atividades extracurriculares', bullying: 'Bullying',
  },
};
const names = Object.assign({}, ...Object.values(groups));
const form = document.querySelector('#form');
const submit = document.querySelector('#submit');
const result = document.querySelector('#result');
const error = document.querySelector('#error');
const percentage = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 2 });
let model;
let inputVersion = 0;

function element(tag, text, parent) {
  const node = document.createElement(tag);
  node.textContent = text;
  parent.append(node);
  return node;
}

function clearResult() {
  inputVersion++;
  error.hidden = true;
  result.textContent = 'Selecione Classificar perfil para avaliar os valores atuais.';
}

function loadProfile(profile) {
  for (const [key, value] of Object.entries(profile)) form.elements.namedItem(key).value = value;
  clearResult();
}

async function initialize() {
  const response = await fetch('/api/modelo');
  if (!response.ok) throw new Error();
  model = await response.json();
  const features = new Map(model.features.map(feature => [feature.key, feature]));
  const fields = document.querySelector('#fields');
  for (const [name, group] of Object.entries(groups)) {
    const fieldset = element('fieldset', '', fields);
    element('legend', name, fieldset);
    const inputs = element('div', '', fieldset);
    inputs.className = 'inputs';
    for (const [key, label] of Object.entries(group)) {
      const { min, max } = features.get(key);
      const wrapper = element('label', label, inputs);
      element('small', key === 'mental_health_history' ? '0 = não · 1 = sim' : `Escala ${min}–${max}`, wrapper);
      const input = element('input', '', wrapper);
      Object.assign(input, { name: key, type: 'number', min, max, step: 1, required: true });
    }
  }
  const profiles = document.querySelector('#profiles');
  model.profiles.forEach((profile, index) => {
    const button = element('button', `Exemplo ${model.levels[index].toLowerCase()}`, profiles);
    button.type = 'button';
    button.addEventListener('click', () => loadProfile(profile));
  });
  document.querySelector('#metric').textContent =
    `Random Forest · ${percentage.format(model.accuracy)} de acurácia no conjunto de teste`;
  const importance = document.querySelector('#importance');
  for (const feature of model.globalImportance) {
    element('li', `${names[feature.key]} · ${percentage.format(feature.importance)}`, importance);
  }
  loadProfile(model.profiles[1]);
  submit.disabled = false;
}

form.addEventListener('input', clearResult);
form.addEventListener('submit', async event => {
  event.preventDefault();
  const version = inputVersion;
  const payload = Object.fromEntries(model.features.map(({ key }) => [key, form.elements.namedItem(key).valueAsNumber]));
  submit.disabled = true;
  error.hidden = true;
  result.textContent = 'Calculando…';
  try {
    const response = await fetch('/api/previsoes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error();
    const prediction = await response.json();
    if (version !== inputVersion) return;
    result.replaceChildren();
    element('strong', prediction.label, result).className = 'level';
    element('small', 'Pontuação do modelo por classe', result);
    prediction.scores.forEach((score, index) => {
      const row = element('div', '', result);
      row.className = 'score';
      element('span', model.levels[index], row);
      const progress = element('progress', '', row);
      progress.value = score;
      progress.setAttribute('aria-label', model.levels[index]);
      element('span', percentage.format(score), row);
    });
  } catch {
    if (version === inputVersion) {
      result.textContent = 'Previsão indisponível.';
      error.textContent = 'Confira os valores e tente novamente.';
      error.hidden = false;
    }
  } finally {
    submit.disabled = false;
  }
});

initialize().catch(() => {
  error.textContent = 'Não foi possível carregar o modelo. Verifique se o servidor está em execução e recarregue.';
  error.hidden = false;
});
