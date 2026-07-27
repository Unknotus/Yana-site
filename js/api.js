// Replace GAS_WEB_APP_URL with your deployed Google Apps Script web app URL
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbze6bwvY2sTt9jK9DyfOogiVwBRUdxLsoCCtnSr-hlwVRkAESYAKXI87cJer4Qk1Xtt/exec';

export async function submitAnswers(payload) {
  if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL.includes('PASTE_YOUR_GAS_URL_HERE')) {
    console.warn('No GAS endpoint configured. Payload:', payload);
    return { ok: false, error: 'No endpoint configured' };
  }

  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    console.error('Failed to submit answers', err);
    return { ok: false, error: String(err) };
  }
}
