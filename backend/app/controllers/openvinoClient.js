// talk to server.py
const fetch = require('node-fetch');

const askOpenVINO = async (prompt, role = 'student') => {
  const url = process.env.OPENVINO_SERVER_URL;

  const res = await fetch(url, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({ question: prompt, role })
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`OpenVINO server ${res.status}: ${msg}`);
  }

  const data = await res.json();
  return data.answer || '[No answer]';
};

module.exports = askOpenVINO;
