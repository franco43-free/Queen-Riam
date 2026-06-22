const axios = require('axios');
const getFakeVcard = require('../lib/fakeVcard');
const { getLang } = require('../lib/lang');

module.exports = async function imdbCommand(sock, chatId, message, query) {
    try {
        if (!query) {
            await sock.sendMessage(chatId, { text: getLang(sock).imdb_usage });
            return;
        }

        const url = `https://apis.davidcyriltech.my.id/imdb?query=${encodeURIComponent(query)}`;
        const res = await axios.get(url);

        if (!res.data.status) {
            await sock.sendMessage(chatId, { text: getLang(sock).imdb_not_found });
            return;
        }

        const m = res.data.movie;

        let reply = `🎬 *${m.title}* (${m.year})\n\n`;
        reply += `⭐ Rated: ${m.rated}\n`;
        reply += `📅 Released: ${m.released}\n`;
        reply += `⏳ Runtime: ${m.runtime}\n`;
        reply += `🎭 Genres: ${m.genres}\n`;
        reply += `🎥 Director: ${m.director}\n`;
        reply += `✍️ Writer: ${m.writer}\n`;
        reply += `🎭 Cast: ${m.actors}\n\n`;
        reply += `📖 Plot: ${m.plot}\n\n`;
        reply += `🌍 Languages: ${m.languages}\n`;
        reply += `🏆 Awards: ${m.awards}\n\n`;
        reply += `⭐ IMDb: ${m.imdbRating}/10 (${m.votes} votes)\n🍅 Rotten Tomatoes: ${m.ratings.find(r => r.Source === "Rotten Tomatoes")?.Value || "N/A"}\n📊 Metacritic: ${m.metascore}\n\n`;
        reply += `💰 Box Office: ${m.boxoffice || "N/A"}\n\n🔗 [IMDb Link](${m.imdbUrl})`;

        // Send poster with caption
        await sock.sendMessage(chatId, {
            image: { url: m.poster },
            caption: reply
        }, { quoted: getFakeVcard() });

    } catch (err) {
        await sock.sendMessage(chatId, { text: getLang(sock).imdb_error });
        console.error("IMDb command error:", err.message);
    }
};