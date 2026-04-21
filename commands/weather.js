const axios = require('axios');
const { sendButtonMessage } = require('../lib/buttonHelper');
const getFakeVcard = require('../lib/fakeVcard');

function getWeatherEmoji(weather) {
    const map = {
        Thunderstorm: "⛈️", Drizzle: "🌦️", Rain: "🌧️", Snow: "❄️",
        Mist: "🌫️", Smoke: "💨", Haze: "🌫️", Dust: "🌪️", Fog: "🌫️",
        Sand: "🏜️", Ash: "🌋", Squall: "💨", Tornado: "🌪️",
        Clear: "☀️", Clouds: "☁️"
    };
    return map[weather] || "🌍";
}

module.exports = async function weatherCommand(sock, chatId, city, message) {
    try {
        const apiUrl   = `https://apis.davidcyriltech.my.id/weather?city=${encodeURIComponent(city)}`;
        const response = await axios.get(apiUrl);
        const w        = response.data;

        if (!w.success || !w.data) {
            return await sock.sendMessage(chatId, {
                text: "❌ Could not find weather for that location."
            }, { quoted: getFakeVcard() });
        }

        const d     = w.data;
        const emoji = getWeatherEmoji(d.weather);
        const text  =
            `🌍 *Weather for ${d.location}, ${d.country}*\n` +
            `${emoji} ${d.description}\n\n` +
            `🌡️ Temperature: *${d.temperature}* (feels like ${d.feels_like})\n` +
            `💧 Humidity: ${d.humidity}\n` +
            `🌬️ Wind: ${d.wind_speed}\n` +
            `📊 Pressure: ${d.pressure}\n\n` +
            `📍 Coordinates: [${d.coordinates.latitude}, ${d.coordinates.longitude}]\n` +
            `🌐 Full forecast: https://wttr.in/${encodeURIComponent(city)}`;

        await sendButtonMessage(sock, chatId, {
            text,
            footer: 'Queen Riam 👑',
            buttons: [
                { id: `.weather ${city}`, text: '🔄 Refresh Weather' },
            ],
        }, message);

    } catch (error) {
        console.error("Error fetching weather:", error);
        await sock.sendMessage(chatId, {
            text: "❌ Sorry, I could not fetch the weather right now."
        }, { quoted: getFakeVcard() });
    }
};
