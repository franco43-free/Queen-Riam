const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const FormData = require("form-data");
const axios = require("axios");
const { fromBuffer } = require("file-type");
const { getLang } = require("../lib/lang");

async function catboxCommand(sock, chatId, message) {
    const lang = getLang(sock);
    let targetMessage = message;
    const quoted = message.message?.extendedTextMessage?.contextInfo;

    if (quoted?.quotedMessage) {
        targetMessage = {
            key: { remoteJid: chatId, id: quoted.stanzaId, participant: quoted.participant },
            message: quoted.quotedMessage
        };
    }

    const msg = targetMessage.message;
    const mediaMessage =
        msg?.imageMessage || msg?.videoMessage || msg?.audioMessage ||
        msg?.documentMessage || msg?.stickerMessage;

    if (!mediaMessage) {
        return await sock.sendMessage(chatId, {
            text: lang.catbox_no_media
        }, { quoted: message });
    }

    try {
        await sock.sendMessage(chatId, { react: { text: "\u23F3", key: message.key } });
        await sock.sendMessage(chatId, { text: lang.catbox_uploading }, { quoted: message });

        const buffer = await downloadMediaMessage(targetMessage, "buffer", {}, {
            logger: undefined,
            reuploadRequest: sock.updateMediaMessage
        });
        if (!buffer) throw new Error("Failed to download media");

        const fileType = await fromBuffer(buffer);
        const ext = fileType?.ext || "bin";
        const mime = fileType?.mime || "application/octet-stream";
        const sizeInMB = (buffer.length / (1024 * 1024)).toFixed(2);

        // Get gofile upload server
        const srvRes = await axios.get("https://api.gofile.io/servers", { timeout: 10000 });
        const server = srvRes.data?.data?.servers?.[0]?.name;
        if (!server) throw new Error("Could not get upload server");

        const form = new FormData();
        form.append("file", buffer, { filename: "upload." + ext, contentType: mime });

        const res = await axios.post("https://" + server + ".gofile.io/contents/uploadfile", form, {
            headers: { ...form.getHeaders() },
            timeout: 60000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        const data = res.data?.data;
        if (!data?.downloadPage) throw new Error("No link returned from server");

        const link = data.downloadPage;
        const senderJid = message.key.participant || message.key.remoteJid;
        const senderName = message.pushName || senderJid.split("@")[0];

        const reply =
            "\u256C\u2550\u2550 \u{1F5C2}\uFE0F *UPLOADER* \u2557\n" +
            "\u2502 \u2192 \u{1F464} *USER:* " + senderName + "\n" +
            "\u2502 \u2192 \u{1F4C1} *TYPE:* " + ext.toUpperCase() + "\n" +
            "\u2502 \u2192 \u{1F529} *SIZE:* " + sizeInMB + " MB\n" +
            "\u2502 \u2192 \u{1F517} *LINK:* " + link + "\n" +
            "\u2502 \u2192 \u23F3 *EXPIRY:* No Expiry\n" +
            "\u2514\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\n" +
            "> *POWERED BY QUEEN RIAM*";

        await sock.sendMessage(chatId, { text: reply }, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: "\u2705", key: message.key } });

    } catch (err) {
        await sock.sendMessage(chatId, { react: { text: "\u274C", key: message.key } });
        await sock.sendMessage(chatId, {
            text: lang.catbox_error
        }, { quoted: message });
    }
}

module.exports = catboxCommand;
