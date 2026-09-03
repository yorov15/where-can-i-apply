import { loadProfile, saveProfile } from './profile.js';
import { readForm, writeForm, onProfileChange } from './form.js';
import { loadIndex } from './data.js';
import { renderResults } from './render.js';

const form = document.getElementById('profile');
const results = document.getElementById('results');
const today = new Date().toISOString().slice(0, 10);

let programs = [];

function refresh(profile) {
  saveProfile(profile, localStorage);
  renderResults(results, profile, programs, today);
}

writeForm(form, loadProfile(localStorage));
onProfileChange(form, refresh);

loadIndex()
  .then((index) => {
    programs = index.programs ?? [];
    refresh(readForm(form));
  })
  .catch((err) => {
    results.textContent = err.message;
  });
