require('dotenv').config();
const sdaHymnal = require('./src/main');
const fs = require('fs');
const { LYRICS } = process.env;
const lyricsList = LYRICS ? LYRICS.split(',') : [1];
const lyricPromises = [];
const jsonData = {
    Folders: [
        {
            Name: LYRICS,
            Lyrics: []
        }
    ]
};

// Add Promises for each lyric
for (let i = 0; i < lyricsList.length; i++) {
    lyricPromises.push(sdaHymnal({
        number: lyricsList[i],
        type: 'json'
    }));
}

// Handle all promises
Promise.all(lyricPromises).then(lyrics => {
    // Add song lyrics to json
    jsonData.Folders[0].Lyrics = lyrics;
    // Write json file
    fs.writeFile(`./dist/${LYRICS}.json`, JSON.stringify(jsonData), err => {
        if (err) {
            console.error(err);
        }
    });
});


