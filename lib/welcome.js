const fs = require("fs");
const path = "./data/userGroupData.json";

function loadData() {
    if (!fs.existsSync(path)) return { welcome: {}, goodbye: {}, customMessages: {} };
    const d = JSON.parse(fs.readFileSync(path));
    if (!d.customMessages) d.customMessages = {};
    return d;
}

function saveData(data) {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

async function handleWelcome(sock, chatId, message, matchText) {
    const data = loadData();
    data.welcome = data.welcome || {};

    if (matchText === "on") {
        data.welcome[chatId] = { enabled: true };
        saveData(data);
        await sock.sendMessage(chatId, { text: "✅ Welcome message enabled!" });
    } else if (matchText === "off") {
        delete data.welcome[chatId];
        saveData(data);
        await sock.sendMessage(chatId, { text: "❌ Welcome message disabled!" });
    } else {
        await sock.sendMessage(chatId, { 
            text: "⚙️ Use:\n*.welcome on* → Enable welcome\n*.welcome off* → Disable welcome"
        });
    }
}

async function handleGoodbye(sock, chatId, message, matchText) {
    const data = loadData();
    data.goodbye = data.goodbye || {};

    if (matchText === "on") {
        data.goodbye[chatId] = { enabled: true };
        saveData(data);
        await sock.sendMessage(chatId, { text: "✅ Goodbye message enabled!" });
    } else if (matchText === "off") {
        delete data.goodbye[chatId];
        saveData(data);
        await sock.sendMessage(chatId, { text: "❌ Goodbye message disabled!" });
    } else {
        await sock.sendMessage(chatId, { 
            text: "⚙️ Use:\n*.goodbye on* → Enable goodbye\n*.goodbye off* → Disable goodbye"
        });
    }
}

function isWelcomeOn(chatId) {
    const data = loadData();
    return data.welcome && data.welcome[chatId] && data.welcome[chatId].enabled;
}

function isGoodbyeOn(chatId) {
    const data = loadData();
    return data.goodbye && data.goodbye[chatId] && data.goodbye[chatId].enabled;
}

// ── Custom message helpers ──────────────────────────────────────────

function getCustomWelcome(groupId) {
    const data = loadData();
    return data.customMessages?.[groupId]?.welcome || null;
}

function getCustomGoodbye(groupId) {
    const data = loadData();
    return data.customMessages?.[groupId]?.goodbye || null;
}

function setCustomWelcome(groupId, text) {
    const data = loadData();
    if (!data.customMessages[groupId]) data.customMessages[groupId] = {};
    data.customMessages[groupId].welcome = text;
    saveData(data);
}

function setCustomGoodbye(groupId, text) {
    const data = loadData();
    if (!data.customMessages[groupId]) data.customMessages[groupId] = {};
    data.customMessages[groupId].goodbye = text;
    saveData(data);
}

function clearCustomWelcome(groupId) {
    const data = loadData();
    if (data.customMessages[groupId]) {
        delete data.customMessages[groupId].welcome;
        if (!Object.keys(data.customMessages[groupId]).length)
            delete data.customMessages[groupId];
    }
    saveData(data);
}

function clearCustomGoodbye(groupId) {
    const data = loadData();
    if (data.customMessages[groupId]) {
        delete data.customMessages[groupId].goodbye;
        if (!Object.keys(data.customMessages[groupId]).length)
            delete data.customMessages[groupId];
    }
    saveData(data);
}

// Replace placeholders in a custom message template
function applyPlaceholders(template, { userNumber, groupName, memberCount, time, date }) {
    return template
        .replace(/{user}/g, `@${userNumber}`)
        .replace(/{group}/g, groupName)
        .replace(/{count}/g, memberCount)
        .replace(/{time}/g, time)
        .replace(/{date}/g, date);
}

module.exports = {
    handleWelcome,
    handleGoodbye,
    isWelcomeOn,
    isGoodbyeOn,
    getCustomWelcome,
    getCustomGoodbye,
    setCustomWelcome,
    setCustomGoodbye,
    clearCustomWelcome,
    clearCustomGoodbye,
    applyPlaceholders
};
