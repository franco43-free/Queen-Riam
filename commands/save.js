const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const getFakeVcard = require('../lib/fakeVcard');
const { getLang } = require('../lib/lang');

/**
 * Save a quoted media status to this bot's own DM.
 * Each paired number saves to their own chat, not the main bot owner.
 * If silent === true, no errors or confirmations are sent to the user.
 */
async function saveCommand(sock, chatId, message, silent = false) {
  const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  if (!quotedMsg) {
    if (!silent) {
      await sock.sendMessage(chatId, {
        text: getLang(sock).save_no_reply
      }, { quoted: getFakeVcard() });
    }
    return;
  }

  try {
    const type = Object.keys(quotedMsg)[0];

    const buffer = await downloadMediaMessage(
      { message: quotedMsg },
      "buffer",
      {},
      { logger: sock.logger, reuploadRequest: sock.updateMediaMessage }
    );

    if (!buffer) {
      if (!silent) {
        await sock.sendMessage(chatId, {
          text: getLang(sock).save_failed
        }, { quoted: getFakeVcard() });
      }
      return;
    }

    let content = {};
    switch (type) {
      case "imageMessage":
        content = {
          image: buffer,
          caption: quotedMsg.imageMessage?.caption || ""
        };
        break;
      case "videoMessage":
        content = {
          video: buffer,
          caption: quotedMsg.videoMessage?.caption || ""
        };
        break;
      case "audioMessage":
        content = {
          audio: buffer,
          mimetype: "audio/mp4",
          ptt: quotedMsg.audioMessage?.ptt || false
        };
        break;
      default:
        if (!silent) {
          await sock.sendMessage(chatId, {
            text: "❌ Only *image, video, or audio* messages are supported."
          }, { quoted: getFakeVcard() });
        }
        return;
    }

    // Correctly strip device suffix (:XX) then extract digits only.
    // e.g. "233257767765:39@s.whatsapp.net" → split(':')[0] = "233257767765" → digits = "233257767765"
    const rawId = (sock.user?.id || '').split(':')[0].replace(/[^0-9]/g, '');
    const selfJid = `${rawId}@s.whatsapp.net`;
    await sock.sendMessage(selfJid, content);

    if (!silent) {
      await sock.sendMessage(chatId, {
        text: "✅ Status saved."
      }, { quoted: getFakeVcard() });
    }

  } catch (err) {
    console.error("Save Command Error:", err);
    if (!silent) {
      await sock.sendMessage(chatId, {
        text: "❌ Error saving message:\n" + err.message
      }, { quoted: getFakeVcard() });
    }
  }
}

module.exports = saveCommand;
