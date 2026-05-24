const CONFIG = {
  ENV: 'dev',
  WEB3FORMS_KEY: '39c512ae-ad7f-4a07-8b89-474adc23c163',
  GOOGLE_REVIEWS_URL: '#',
  FIRESTORE_COLLECTION: 'config-dev',
  FIRESTORE_CONFIG_DOC: 'settings',
  AVIS_COLLECTION:      'avis-dev',
  COOLDOWNS_COLLECTION: 'cooldowns-dev',
};

(function() {
  const banner = document.createElement('div');
  banner.style.cssText = 'background:#f5a623;color:#1a1a1a;padding:6px 12px;font-size:13px;font-weight:bold;position:sticky;top:0;z-index:999;display:flex;align-items:center;justify-content:center;gap:12px;';
  banner.textContent = '⚠️ MODE DEV – Les avis ne sont PAS envoyés en production';

  if (!window.location.pathname.startsWith('/admin')) {
    const btn = document.createElement('a');
    btn.href = '/admin';
    btn.textContent = '⚙️ Admin';
    btn.style.cssText = 'background:#1a1a1a;color:#f5a623;font-size:12px;font-weight:bold;padding:3px 10px;border-radius:99px;text-decoration:none;white-space:nowrap;';
    banner.appendChild(btn);
  }

  document.body.prepend(banner);
})();
