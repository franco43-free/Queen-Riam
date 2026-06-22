const path = require('path');
const { loadConfig } = require('./config');

const SUPPORTED = ['en', 'fr', 'pt', 'es', 'hi', 'ha'];
const LANG_NAMES = {
  en: 'English',
  fr: 'Français',
  pt: 'Português',
  es: 'Español',
  hi: 'हिन्दी',
  ha: 'Hausa',
};

// Per-session cache: key = sessionNumber (or 'main'), value = { lang, strings }
const _sessionCache = {};

/**
 * getLang(ref?)
 *   ref = undefined/null  → use main bot config
 *   ref = string          → use that sessionNumber
 *   ref = sock object     → read sock._sessionNumber (set by handleMessages / sessionManager)
 */
function getLang(ref) {
  let sessionNumber;
  if (!ref) {
    sessionNumber = null;
  } else if (typeof ref === 'string') {
    sessionNumber = ref;
  } else if (typeof ref === 'object') {
    sessionNumber = ref._sessionNumber || null;
  } else {
    sessionNumber = null;
  }

  const cfg = loadConfig(sessionNumber);
  const lang = SUPPORTED.includes(cfg.LANGUAGE) ? cfg.LANGUAGE : 'en';
  const cacheKey = sessionNumber || 'main';

  if (_sessionCache[cacheKey] && _sessionCache[cacheKey].lang === lang) {
    return _sessionCache[cacheKey].strings;
  }

  let strings;
  try {
    strings = require(path.join(__dirname, '../lang', lang));
  } catch (_) {
    strings = require(path.join(__dirname, '../lang/en'));
  }

  _sessionCache[cacheKey] = { lang, strings };
  return strings;
}

function invalidateCache(sessionNumber) {
  if (sessionNumber) {
    delete _sessionCache[sessionNumber];
  } else {
    delete _sessionCache['main'];
  }
}

module.exports = { getLang, invalidateCache, SUPPORTED, LANG_NAMES };
