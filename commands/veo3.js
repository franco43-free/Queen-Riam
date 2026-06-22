const axios = require('axios');
const getFakeVcard = require('../lib/fakeVcard');
const { getLang } = require('../lib/lang');

const API_BASE = 'https://text2video.officialhectormanuel.workers.dev';

async function generateVideo(prompt) {
    const res = await axios.get(API_BASE + '/generate', {
        params: { prompt, aspect: '16:9' },
        timeout: 60000,
    });

    const data = res.data;
    if (!data.status || !data.download_url) {
        throw new Error('API did not return a download URL');
    }

    const videoRes = await axios.get(data.download_url, {
        responseType: 'arraybuffer',
        timeout: 60000,
    });

    return Buffer.from(videoRes.data);
}

async function veo3Command(sock, chatId, message, query) {
    if (!query) {
        await sock.sendMessage(chatId, {
            text: getLang(sock).veo3_no_prompt,
        }, { quoted: getFakeVcard() });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: '🎬', key: message.key } });
    await sock.sendMessage(chatId, {
        text: getLang(sock).veo3_generating,
    }, { quoted: getFakeVcard() });
    await sock.sendPresenceUpdate('recording', chatId);

    try {
        const videoBuffer = await generateVideo(query);

        await sock.sendMessage(chatId, {
            video: videoBuffer,
            mimetype: 'video/mp4',
            caption: '🎬 *AI Video Generated*\n\n📝 Prompt: _' + query + '_\n\n_Powered by Queen Riam_',
        }, { quoted: getFakeVcard() });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
    } catch (err) {
        console.error('[VEO3] Error:', err.message);
        await sock.sendMessage(chatId, {
            text: getLang(sock).veo3_failed,
        }, { quoted: getFakeVcard() });
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
    } finally {
        await sock.sendPresenceUpdate('paused', chatId);
    }
}

module.exports = veo3Command;
