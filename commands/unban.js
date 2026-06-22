const fs = require('fs');
const path = require('path');
const { channelInfo } = require('../lib/messageConfig');

const { getLang } = require('../lib/lang');
function _bannedFile(sock){const sid=sock&&sock._sessionNumber?sock._sessionNumber:null;return require('path').join(__dirname,sid?'../data/banned_'+sid+'.json':'../data/banned.json');}

async function unbanCommand(sock, chatId, message) {
    let userToUnban;
    
    // Check for mentioned users
    if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        userToUnban = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }
    // Check for replied message
    else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        userToUnban = message.message.extendedTextMessage.contextInfo.participant;
    }
    
    if (!userToUnban) {
        await sock.sendMessage(chatId, { 
            text: getLang(sock).unban_no_target, 
            ...channelInfo 
        });
        return;
    }

    try {
        const BAN_FILE=_bannedFile(sock);const bannedUsers=fs.existsSync(BAN_FILE)?JSON.parse(fs.readFileSync(BAN_FILE)):[];
        const index = bannedUsers.indexOf(userToUnban);
        if (index > -1) {
            bannedUsers.splice(index, 1);
            fs.writeFileSync(BAN_FILE, JSON.stringify(bannedUsers, null, 2));
            
            await sock.sendMessage(chatId, { 
                text: getLang(sock).unban_success.replace('{user}', userToUnban.split('@')[0]),
                mentions: [userToUnban],
                ...channelInfo 
            });
        } else {
            await sock.sendMessage(chatId, { 
                text: getLang(sock).unban_not_banned.replace('{user}', userToUnban.split('@')[0]),
                mentions: [userToUnban],
                ...channelInfo 
            });
        }
    } catch (error) {
        console.error('Error in unban command:', error);
        await sock.sendMessage(chatId, { text: getLang(sock).unban_failed, ...channelInfo });
    }
}

module.exports = unbanCommand; 