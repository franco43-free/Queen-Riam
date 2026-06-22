const fs = require('fs');
const path = require('path');

const { getLang } = require('../lib/lang');
function _warningsFile(sock){const sid=sock&&sock._sessionNumber?sock._sessionNumber:null;return sid?require('path').join(__dirname,'../data/warnings_'+sid+'.json'):require('path').join(__dirname,'../data/warnings.json');}

function loadWarnings(sock) {
    const f=_warningsFile(sock);
    if (!fs.existsSync(f)) fs.writeFileSync(f, JSON.stringify({}), 'utf8');
    return JSON.parse(fs.readFileSync(f, 'utf8'));
}

async function warningsCommand(sock, chatId, mentionedJidList) {
    const warnings = loadWarnings(sock);

    if (mentionedJidList.length === 0) {
        await sock.sendMessage(chatId, { text: getLang(sock).warnings_no_mention });
        return;
    }

    const userToCheck = mentionedJidList[0];
    const warningCount = warnings[userToCheck] || 0;

    await sock.sendMessage(chatId, { text: getLang(sock).warnings_count.replace('{count}', warningCount) });
}

module.exports = warningsCommand;
