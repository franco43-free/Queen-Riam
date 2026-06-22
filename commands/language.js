const { loadConfig, saveConfig } = require('../lib/config');
const { invalidateCache, SUPPORTED, LANG_NAMES, getLang } = require('../lib/lang');
const getFakeVcard = require('../lib/fakeVcard');

async function languageCommand(sock, chatId, message, args, sessionNumber) {
  const isOwner = message.key.fromMe;
  const t = getLang(sessionNumber);

  if (!isOwner) {
    await sock.sendMessage(chatId, {
      text: t.language_owner_only,
    }, { quoted: getFakeVcard() });
    return;
  }

  if (chatId.endsWith('@g.us')) {
    await sock.sendMessage(chatId, {
      text: t.language_dm_only,
    }, { quoted: getFakeVcard() });
    return;
  }

  const cfg = loadConfig(sessionNumber);
  const current = cfg.LANGUAGE || 'en';

  if (!args || args.length === 0) {
    const currentName = LANG_NAMES[current] || current.toUpperCase();
    const text = t.language_usage.replace('{current}', `*${currentName}* (${current})`);
    await sock.sendMessage(chatId, { text }, { quoted: getFakeVcard() });
    return;
  }

  const requested = args[0].toLowerCase().trim();

  if (!SUPPORTED.includes(requested)) {
    await sock.sendMessage(chatId, {
      text: t.language_invalid,
    }, { quoted: getFakeVcard() });
    return;
  }

  if (requested === current) {
    await sock.sendMessage(chatId, {
      text: t.language_already_set
        .replace('{langname}', LANG_NAMES[requested] || requested)
        .replace('{lang}', requested),
    }, { quoted: getFakeVcard() });
    return;
  }

  cfg.LANGUAGE = requested;
  saveConfig(cfg, sessionNumber);
  invalidateCache(sessionNumber);

  const tNew = getLang(sessionNumber);
  await sock.sendMessage(chatId, {
    text: tNew.language_changed
      .replace('{lang}', requested)
      .replace('{langname}', LANG_NAMES[requested] || requested),
  }, { quoted: getFakeVcard() });
}

module.exports = languageCommand;
