const axios = require('axios');
const { getLang } = require('../lib/lang');
const getFakeVcard = require('../lib/fakeVcard');

// Suno API configuration
const SUNO_API_BASE = "https://api.songgenerator.org";

async function sunoCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const prompt = text.split(' ').slice(1).join(' ').trim();
        
        if (!prompt) {
            return await sock.sendMessage(chatId, { text: getLang(sock).suno_usage }, { quoted: getFakeVcard() });
        }

        // Show elegant processing message
        const processingMsg = await sock.sendMessage(chatId, {
            text: `🎼 *AI Music Studio*\n━━━━━━━━━━━━━━━━\n\n🎤 *Prompt:* ${prompt}\n\n⚡ *Status:* Initializing AI composer...\n⏱️ *ETA:* 2-3 minutes\n\n🎹 Composing melody...\n🎤 Generating vocals...\n🎧 Mixing audio...\n\n*Powered By Hector*`
        }, { quoted: getFakeVcard() });

        // Step 1: Sign in to get token
        const deviceId = generateDeviceId();
        let token;
        
        try {
            const signinResponse = await axios.post(`${SUNO_API_BASE}/signin`, {
                platform: 'android',
                device_id: deviceId
            }, {
                timeout: 30000
            });

            token = signinResponse.data?.data?.token || signinResponse.data?.token;
            if (!token) {
                throw new Error('No authentication token received');
            }
        } catch (authError) {
            console.error('Auth error:', authError);
            await sock.sendMessage(chatId, {
                text: getLang(sock).suno_auth_failed
            }, { quoted: getFakeVcard() });
            return;
        }

        // Step 2: Generate song
        const songData = {
            name: prompt.substring(0, 30) + (prompt.length > 30 ? '...' : ''),
            prompt: prompt,
            genre: 'pop',
            mood: 'happy',
            vocal_gender: 'female',
            make_instrumental: false,
            is_lyric: false
        };

        let requestId;
        try {
            const generateResponse = await axios.post(`${SUNO_API_BASE}/users/make-song`, songData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            requestId = generateResponse.data?.request_id || generateResponse.data?.id || 
                       (generateResponse.data?.data && generateResponse.data.data.request_id);
            
            if (!requestId) {
                throw new Error('No request ID received');
            }
        } catch (generateError) {
            console.error('Generate error:', generateError);
            await sock.sendMessage(chatId, {
                text: getLang(sock).suno_gen_failed
            }, { quoted: getFakeVcard() });
            return;
        }

        // Step 3: Poll for status with better progress updates
        let attempts = 0;
        const maxAttempts = 72; // 6 minutes max (72 * 5s = 360s)
        let audioUrl = null;
        let songTitle = songData.name;
        let generationCompleted = false;

        const statusMessages = [
            "🎹 Composing melody...",
            "🎤 Generating vocals...", 
            "🎧 Mixing audio...",
            "🎛️  Mastering track...",
            "📀 Finalizing output..."
        ];

        const pollInterval = setInterval(async () => {
            if (generationCompleted) {
                clearInterval(pollInterval);
                return;
            }
            
            attempts++;
            
            try {
                const statusResponse = await axios.get(`${SUNO_API_BASE}/users/request-status/${requestId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    timeout: 30000
                });

                const data = statusResponse.data?.data || statusResponse.data;
                const status = data?.request_status || data?.status;

                // Update progress with cool animations
                const progress = Math.min((attempts / maxAttempts) * 100, 95);
                const statusIndex = Math.min(Math.floor(attempts / 12), statusMessages.length - 1);
                const dots = '.'.repeat((attempts % 3) + 1);
                const animation = ['◐', '◓', '◑', '◒'][attempts % 4];
                
                if (attempts % 4 === 0) { // Update every 20 seconds
                    await sock.sendMessage(chatId, {
                        edit: processingMsg.key,
                        text: `🎼 *AI Music Studio*\n━━━━━━━━━━━━━━━━\n\n🎤 *Prompt:* ${prompt}\n\n${animation} *Status:* ${statusMessages[statusIndex]} ${dots}\n📊 *Progress:* ${Math.floor(progress)}%\n⏱️ *ETA:* ${Math.max(1, Math.ceil((maxAttempts - attempts) * 5 / 60))} min\n\n*Powered By Hector*`
                    });
                }

                if (status === 'COMPLETED') {
                    generationCompleted = true;
                    clearInterval(pollInterval);
                    
                    // Extract audio URL
                    const resultData = data.result_data;
                    if (typeof resultData === 'string' && resultData.startsWith('http')) {
                        audioUrl = resultData;
                    } else if (Array.isArray(resultData) && resultData.length > 0) {
                        audioUrl = resultData[0].audio_url || resultData[0];
                    }

                    if (data.title) {
                        songTitle = data.title;
                    }

                    if (audioUrl) {
                        // Send final success message
                        await sock.sendMessage(chatId, {
                            edit: processingMsg.key,
                            text: `✅ *Song Created Successfully!*\n━━━━━━━━━━━━━━━━\n\n🎵 *Title:* ${songTitle}\n📝 *Prompt:* ${prompt}\n⏱️ *Generation Time:* ${Math.ceil(attempts * 5 / 60)} minutes\n\n🎶 Sending your masterpiece...\n\n*Powered By Hector*`
                        });

                        // Send the audio file with professional metadata
                        await sock.sendMessage(chatId, {
                            audio: { url: audioUrl },
                            mimetype: "audio/mpeg",
                            fileName: `${cleanFilename(songTitle)}.mp3`,
                            contextInfo: {
                                externalAdReply: {
                                    title: `🎵 ${songTitle}`,
                                    body: `AI Generated • ${prompt.substring(0, 40)}...`,
                                    mediaType: 2,
                                    thumbnail: await getDefaultThumbnail(),
                                    mediaUrl: audioUrl,
                                    sourceUrl: audioUrl
                                }
                            }
                        }, { quoted: getFakeVcard() });

                        // Success reaction
                        await sock.sendMessage(chatId, {
                            react: { text: "🎵", key: message.key }
                        });

                    } else {
                        throw new Error('No audio URL found in response');
                    }

                } else if (status === 'FAILED' || status === 'ERROR') {
                    generationCompleted = true;
                    clearInterval(pollInterval);
                    const errorMsg = data?.error || data?.message || 'Unknown error occurred';
                    throw new Error(`Generation failed: ${errorMsg}`);
                } else if (attempts >= maxAttempts) {
                    generationCompleted = true;
                    clearInterval(pollInterval);
                    throw new Error('Song generation timeout. The servers might be busy.');
                }

            } catch (pollError) {
                if (!generationCompleted) {
                    generationCompleted = true;
                    clearInterval(pollInterval);
                    console.error('Poll error:', pollError);
                    
                    await sock.sendMessage(chatId, {
                        edit: processingMsg.key,
                        text: `❌ *Generation Interrupted*\n\nError: ${pollError.message}\n\nPlease try again with a different prompt.\n\n> Powered By Hector`
                    });
                }
            }
        }, 5000); // Check every 5 seconds

        // Safety timeout - FIXED: Won't trigger if generation completes
        const safetyTimeout = setTimeout(() => {
            if (!generationCompleted) {
                generationCompleted = true;
                clearInterval(pollInterval);
                sock.sendMessage(chatId, {
                    text: `⏰ *Generation Timeout*\n\nThe song took longer than expected to generate.\nServer might be busy. Please try again later.\n\n*Powered By Hector*`
                });
            }
        }, 360000); // 6 minutes timeout

        // Clean up timeout if generation completes
        pollInterval.on = true; // Mark interval for cleanup
        if (generationCompleted) {
            clearTimeout(safetyTimeout);
        }

    } catch (error) {
        console.error('Error in suno command:', error);
        await sock.sendMessage(chatId, {
            text: `❌ *Unexpected Error*\n\nFailed to process your request.\nPlease try again later.\n\n*Powered By Hector*`
        }, { quoted: getFakeVcard() });
    }
}

// Helper function to generate device ID
function generateDeviceId() {
    return Array.from({length: 16}, () => 
        Math.floor(Math.random() * 16).toString(16)
    ).join('');
}

// Helper function to clean filename
function cleanFilename(name) {
    return name.replace(/[<>:"/\\|?*]/g, '').substring(0, 50);
}

// Helper function to get default thumbnail
async function getDefaultThumbnail() {
    try {
        const response = await axios.get('https://i.imgur.com/6H0FXSa.jpeg', { 
            responseType: 'arraybuffer',
            timeout: 10000
        });
        return Buffer.from(response.data);
    } catch {
        // Return null if thumbnail fails
        return null;
    }
}

module.exports = sunoCommand;