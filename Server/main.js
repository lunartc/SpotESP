require("dotenv").config();
const axios = require("axios");
const qs = require("qs");
const { serialport, SerialPort } = require("serialport");
const { ReadlineParser } = require('@serialport/parser-readline');


const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const refresh_token = process.env.SPOTIFY_TOKEN; 
const _ESP32COM = process.env.ESP32_COM;
const _LRCLIBAPI = "https://lrclib.net/api/"



let cachedAccessToken = null;
let tokenExpirationTime = 0;
let _TRACKCACHED = null;
let activeTimers = [];

// ESP32 COMMUNICATION CONFIGURATION
const port = new SerialPort({
    path: _ESP32COM,
    baudRate: 115200
})
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));


port.on('open', () => {
    console.log(`SerialPort Connected!`)
})


const refreshMyToken = async () => {
    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', 
            qs.stringify({
                grant_type: 'refresh_token',
                refresh_token: refresh_token
            }), {
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${client_id}:${client_secret}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log("--- New Access Token Generated ---");
        console.log(response.data.access_token);
        return response.data;
    } catch (error) {
        console.error("Refresh Error:", error.response ? error.response.data : error.message);
    }
};


const getValidToken = async () => {
    const now = Date.now();
    
    if (!cachedAccessToken || now > (tokenExpirationTime - 300000)) {
        const data = await refreshMyToken();
        cachedAccessToken = data.access_token;
        tokenExpirationTime = now + (data.expires_in * 1000); 
    }
    
    return cachedAccessToken;
};


const getCurrent = async () => {
    try {
        const _TOKEN = await getValidToken(); 
        
        const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: { 'Authorization': `Bearer ${_TOKEN}` }
        });

        if (response.status === 204 || !response.data.item) {
            console.log("No song is currently playing.");
            return;
        }

        const track = response.data.item;
        const artistName = track.artists.map(artist => artist.name).join(', ');
        let cleanName = track.name.replace(/[\u2018\u2019]/g, "'");
        let cleanArtist = artistName.replace(/[\u2018\u2019]/g, "'");
        const progressMS = response.data.progress_ms;
        const durationMS = track.duration_ms;
        const track_album = track.album.name;
        const totalSeconds = Math.floor(durationMS / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const formattedSeconds = seconds.toString().padStart(2, '0');
        if(track.name != _TRACKCACHED) {
            _TRACKCACHED = track.name;
            const header = `##${cleanName}|${cleanArtist}|${track_album}\n`;
            port.write(header);
            console.log(`Now Playing: ${track.name}`);
            getLyrics(totalSeconds, artistName, track.name, track_album, progressMS);
        }

    } catch (error) {
        console.log("Error:", error.response ? error.response.data : error.message);
    }
};


const getLyrics = async (duration, artists, music, album_name, progress) => {
    //Clean the Track Title
    let __SANITIZETRACK = music.split('(')[0].trim();
    console.log(__SANITIZETRACK);
    try {
        const response = await axios.get(`${_LRCLIBAPI}/get?artist_name=${artists}&track_name=${__SANITIZETRACK}&duration=${duration}&album_name=${album_name}`)
        console.log(response.data);
        sendLyrics(response.data.syncedLyrics, progress)
    } catch (error) {
        console.log("Error on getting lyrics!", error.response ? error.response.data : error.message);
    }
}

const sendLyrics = async (syncedLyrics, progress) => {
    activeTimers.forEach(clearTimeout);
    activeTimers = [];

    if (!syncedLyrics) {
        port.write("No lyrics found\n");
        return;
    }

    const lyricsLines = syncedLyrics.split('\n');

    lyricsLines.forEach(line => {
        const match = line.match(/\[(\d{2}):(\d{2}\.\d{2})\](.*)/);
        
        if (match) {
            let lyricText = match[3].trim();

            // 1. Manual map for the most common "Box/Rectangle" offenders
            const charMap = {
                '’': "'", '‘': "'", '”': '"', '“': '"', 
                '–': "-", '—': "-", '…': "...", 'é': "e", 
                'á': "a", 'í': "i", 'ó': "o", 'ú': "u"
            };
            
            // Apply the map
            lyricText = lyricText.split('').map(char => charMap[char] || char).join('');

            // 2. The "Nuclear Option": Strip any remaining non-ASCII characters
            // This removes anything that isn't a standard letter, number, or punctuation
            lyricText = lyricText.normalize("NFD").replace(/[^\x00-\x7F]/g, "");

            const minutes = parseInt(match[1]);
            const seconds = parseFloat(match[2]);
            const timeInMs = (minutes * 60 + seconds) * 1000;
            const delay = timeInMs - progress;

            if (delay > 0) {
                const timer = setTimeout(() => {
                    console.log(`Sending Cleaned: ${lyricText}`);
                    port.write(`${lyricText}\n`); 
                }, delay - 1500);

                activeTimers.push(timer);
            }
        }
    });
};

setInterval(getCurrent, 5000);