import axios from 'axios';

const http = axios.create({
  baseURL: '',
});

export async function getResults() {
  const res = await http.get('/results');
  return res.data;
}

export async function uploadProject(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await http.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function runWhatIf(durationMultiplier) {
  const res = await http.post('/whatif', { duration_multiplier: durationMultiplier });
  return res.data;
}

