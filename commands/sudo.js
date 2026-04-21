const fs = require('fs');
const path = require('path');
const getFakeVcard = require('../lib/fakeVcard');

// Path to sudo users JSON file
const SUDO_FILE = path.join(__dirname, '../data/sudo.json');

// Ensure data directory exists
const dataDir = path.dirname(SUDO_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Load sudo users from file
function loadSudoUsers() {
    try {
        if (fs.existsSync(SUDO_FILE)) {
            const data = fs.readFileSync(SUDO_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading sudo users:', error);
    }
    return { users: [] };
}

// Save sudo users to file
function saveSudoUsers(sudoUsers) {
    try {
        fs.writeFileSync(SUDO_FILE, JSON.stringify(sudoUsers, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving sudo users:', error);
        return false;
    }
}

// Check if a user is sudo
function isSudoUser(userId) {
    const sudoUsers = loadSudoUsers();
    const cleanUserId = userId.replace('@s.whatsapp.net', '').replace('@lid', '').replace(/[^0-9]/g, '');
    const isSudo = sudoUsers.users.some(u => u.replace(/[^0-9]/g, '') === cleanUserId);
    return isSudo;
}

// Add sudo user
function addSudoUser(userId) {
    const sudoUsers = loadSudoUsers();
    const cleanUserId = userId.replace(/[^0-9]/g, '');
    
    console.log(`➕ Adding sudo user: ${cleanUserId}`);
    
    if (!sudoUsers.users.includes(cleanUserId)) {
        sudoUsers.users.push(cleanUserId);
        const success = saveSudoUsers(sudoUsers);
        console.log(`📁 Save successful: ${success}`);
        return success;
    }
    return true; // Already exists
}

// Remove sudo user
function removeSudoUser(userId) {
    const sudoUsers = loadSudoUsers();
    const cleanUserId = userId.replace(/[^0-9]/g, '');
    const index = sudoUsers.users.indexOf(cleanUserId);
    
    if (index > -1) {
        sudoUsers.users.splice(index, 1);
        return saveSudoUsers(sudoUsers);
    }
    return true; // Didn't exist
}

// Get all sudo users
function getAllSudoUsers() {
    return loadSudoUsers().users;
}

// Check if user has sudo/owner privileges
// botJid = the currently-connected bot account JID (sock.user.id)
function hasOwnerPrivileges(userId, message, botJid = null) {
    // fromMe = message sent from the connected account itself
    if (message.key.fromMe) return true;

    const cleanId = userId.replace(/[^0-9]/g, '');

    // Connected bot account is automatically owner — whoever deployed the bot
    if (botJid) {
        const botNum = String(botJid).replace(/[^0-9]/g, '').split(':')[0];
        if (botNum && botNum === cleanId) return true;
    }

    // Check against owner.json (includes the developer/creator number)
    try {
        const ownerList = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/owner.json'), 'utf8'));
        if (Array.isArray(ownerList) && ownerList.some(num => String(num).replace(/[^0-9]/g, '') === cleanId)) {
            return true;
        }
    } catch (_) {}

    // Check if user is in sudo list
    return isSudoUser(userId);
}

// Main sudo command handler
async function sudoCommand(sock, chatId, message, settings) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const args = text.split(' ').slice(1);
        const command = args[0]?.toLowerCase();
        const targetNumber = args[1];
        
        // Only bot owner can manage sudo users
        if (!message.key.fromMe) {
            await sock.sendMessage(chatId, {
                text: "❌ This command is only for the bot owner!",
                mentions: []
            }, { quoted: getFakeVcard() });
            return;
        }

        if (!command) {
            // Show sudo users list
            const sudoUsers = getAllSudoUsers();
            let userList = '👑 *Sudo Users List*\n\n';
            
            if (sudoUsers.length === 0) {
                userList += 'No sudo users added yet.';
            } else {
                sudoUsers.forEach((user, index) => {
                    userList += `${index + 1}. ${user}\n`;
                });
            }
            
            userList += `\n*Usage:*\n• ${settings.prefix}sudo add <number> - Add sudo user\n• ${settings.prefix}sudo remove <number> - Remove sudo user\n• ${settings.prefix}sudo list - Show all sudo users`;
            
            await sock.sendMessage(chatId, {
                text: userList
            }, { quoted: getFakeVcard() });
            return;
        }

        if (command === 'list') {
            const sudoUsers = getAllSudoUsers();
            let userList = '👑 *Sudo Users List*\n\n';
            
            if (sudoUsers.length === 0) {
                userList += 'No sudo users added yet.';
            } else {
                sudoUsers.forEach((user, index) => {
                    userList += `${index + 1}. ${user}\n`;
                });
                userList += `\nTotal: ${sudoUsers.length} user(s)`;
            }
            
            await sock.sendMessage(chatId, {
                text: userList
            }, { quoted: getFakeVcard() });
            return;
        }

        if (command === 'add' || command === 'remove') {
            if (!targetNumber) {
                await sock.sendMessage(chatId, {
                    text: `❌ Please provide a phone number!\n\nUsage: ${settings.prefix}sudo ${command} 233509977128`
                }, { quoted: getFakeVcard() });
                return;
            }

            // Validate phone number format (basic validation)
            const cleanNumber = targetNumber.replace(/[^0-9]/g, '');
            if (cleanNumber.length < 10 || cleanNumber.length > 15) {
                await sock.sendMessage(chatId, {
                    text: '❌ Invalid phone number format! Please provide a valid number like: 233509977128'
                }, { quoted: getFakeVcard() });
                return;
            }

            if (command === 'add') {
                const success = addSudoUser(cleanNumber);
                if (success) {
                    await sock.sendMessage(chatId, {
                        text: `✅ *Sudo user added!*\n\nNumber: ${cleanNumber}\n\nThis user now has access to all owner commands.`
                    }, { quoted: getFakeVcard() });
                } else {
                    await sock.sendMessage(chatId, {
                        text: '❌ Failed to add sudo user. Please try again.'
                    }, { quoted: getFakeVcard() });
                }
            } else if (command === 'remove') {
                const success = removeSudoUser(cleanNumber);
                if (success) {
                    await sock.sendMessage(chatId, {
                        text: `✅ *Sudo user removed!*\n\nNumber: ${cleanNumber}\n\nThis user no longer has owner privileges.`
                    }, { quoted: getFakeVcard() });
                } else {
                    await sock.sendMessage(chatId, {
                        text: '❌ Failed to remove sudo user. Please try again.'
                    }, { quoted: getFakeVcard() });
                }
            }
            return;
        }

        // Invalid command
        await sock.sendMessage(chatId, {
            text: `❌ Invalid sudo command!\n\n*Available commands:*\n• ${settings.prefix}sudo add <number>\n• ${settings.prefix}sudo remove <number>\n• ${settings.prefix}sudo list\n• ${settings.prefix}sudo`
        }, { quoted: getFakeVcard() });

    } catch (error) {
        console.error('Error in sudo command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ An error occurred while processing the sudo command.'
        }, { quoted: getFakeVcard() });
    }
}

module.exports = {
    sudoCommand,
    isSudoUser,
    hasOwnerPrivileges,
    addSudoUser,
    removeSudoUser,
    getAllSudoUsers
};