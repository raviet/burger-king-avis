const CONFIG = {
  ENV: 'dev',
  WEB3FORMS_KEY: '39c512ae-ad7f-4a07-8b89-474adc23c163',
  GOOGLE_REVIEWS_URL: '#',
  FIRESTORE_COLLECTION: 'config-dev',
  FIRESTORE_CONFIG_DOC: 'settings',
  AVIS_COLLECTION: 'avis-dev',
};

(function() {
  const banner = document.createElement('div');
  banner.style.cssText = 'background:#f5a623;color:#1a1a1a;text-align:center;padding:6px;font-size:13px;font-weight:bold;position:sticky;top:0;z-index:999;';
  banner.textContent = '⚠️ MODE DEV – Les avis ne sont PAS envoyés en production';
  document.body.prepend(banner);
})();
