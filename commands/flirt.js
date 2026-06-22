const fetch = require('node-fetch');
const getFakeVcard = require('../lib/fakeVcard');
const { getLang } = require('../lib/lang');

async function flirtCommand(sock, chatId, message) {
    try {
        const shizokeys = 'knightbot';
        const res = await fetch(`https://api.shizo.top/api/quote/flirt?apikey=${shizokeys}`);
        
        if (!res.ok) {
            throw await res.text();
        }
        
        const json = await res.json();
        const flirtMessage = json.result;

        // Send the flirt message
        await sock.sendMessage(chatId, { text: flirtMessage }, { quoted: getFakeVcard() });
    } catch (error) {
        console.error('Error in flirt command:', error);
        await sock.sendMessage(chatId, { text: getLang(sock).flirt_error }, { quoted: getFakeVcard() });
    }
}

module.exports = { flirtCommand }; 