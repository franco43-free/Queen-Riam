const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const settings = require('../settings');
const getFakeVcard = require('../lib/fakeVcard');

/**
 * Save a quoted media status to the bot owner's chat.
 * If silent === true, no errors or confirmations are sent to the user.
 */
async function saveCommand(sock, chatId, message, silent = false) {
  const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  if (!quotedMsg) {
    if (!silent) {
      await sock.sendMessage(chatId, {
        text: "🍁 Please reply to a *status* (or any media) to save it!"
      }, { quoted: getFakeVcard() });
    }
    return;
  }

  try {
    const type = Object.keys(quotedMsg)[0]; // imageMessage / videoMessage / audioMessage

    const buffer = await downloadMediaMessage(
      { message: quotedMsg },
      "buffer",
      {},
      { logger: sock.logger, reuploadRequest: sock.updateMediaMessage }
    );

    if (!buffer) {
      if (!silent) {
        await sock.sendMessage(chatId, {
          text: "❌ Failed to download media!"
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

    // Send the media to the bot's owner.
    // sock.user.id includes the device suffix (e.g. :20) — decode it first.
    // Fall back to settings.ownerNumber if decodeJid isn't available.
    let ownerJid;
    if (typeof sock.decodeJid === 'function') {
      ownerJid = sock.decodeJid(sock.user.id);
    } else {
      const raw = (settings.ownerNumber || sock.user.id).replace(/[^0-9]/g, '');
      ownerJid = `${raw}@s.whatsapp.net`;
    }
    await sock.sendMessage(ownerJid, content);

    // Confirmation message ONLY if not silent
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
