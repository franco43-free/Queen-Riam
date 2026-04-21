const fetch = require("node-fetch");
const getFakeVcard = require('../lib/fakeVcard');

async function goodnightCommand(sock, chatId, message) {
    try {
        const res = await fetch("https://goodnight-api.officialhectormanuel.workers.dev/");
        
        if (!res.ok) {
            throw await res.text();
        }
        
        const json = await res.json();
        const goodnightMessage = json.message || "Good night 🌙💤";

        // Send the goodnight message
        await sock.sendMessage(chatId, { text: goodnightMessage }, { quoted: getFakeVcard() });
    } catch (error) {
        console.error("Error in goodnight command:", error);
        await sock.sendMessage(
            chatId,
            { text: "❌ Failed to get goodnight message. Please try again later!" },
            { quoted: getFakeVcard() }
        );
    }
}

module.exports = { goodnightCommand };