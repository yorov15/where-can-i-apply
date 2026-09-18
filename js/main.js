import { loadProfile, saveProfile } from './profile.js';
import { readForm, writeForm, onProfileChange, setupProfileBox } from './form.js';
import { loadIndex, loadDetails } from './data.js';
import { renderResults } from './render.js';

const form = document.getElementById('profile');
const nodes = {
  summaryNode: document.getElementById('summary'),
  resultsNode: document.getElementById('results'),
};
const today = new Date().toISOString().slice(0, 10);

let programs = [];
const details = { status: 'loading', programs: {}, retry: fetchDetails };

const saved = loadProfile(localStorage);
writeForm(form, saved);
const profileBox = setupProfileBox(
  {
    box: document.getElementById('profile-box'),
    summary: document.getElementById('profile-summary-text'),
    button: document.getElementById('show-results'),
    target: nodes.summaryNode,
  },
  saved,
);

function refresh(profile = readForm(form)) {
  saveProfile(profile, localStorage);
  profileBox.update(profile);
  renderResults(nodes, profile, programs, today, details);
}

function fetchDetails() {
  details.status = 'loading';
  refresh();
  loadDetails()
    .then((data) => {
      details.programs = data.programs ?? {};
      details.status = 'ready';
    })
    .catch(() => {
      details.status = 'failed';
    })
    .finally(() => refresh());
}

onProfileChange(form, (profile) => refresh(profile));

loadIndex()
  .then((index) => {
    programs = index.programs ?? [];
    fetchDetails();
  })
  .catch((err) => {
    nodes.resultsNode.textContent = err.message;
  });
