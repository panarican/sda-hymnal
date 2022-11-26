const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const dbPath = path.resolve(__dirname, 'data/hymns.db')
const db = new sqlite3.Database(dbPath, err => {
   if (err) console.log(err)
});

function formatRow(row) {
   let title = row.title
   let number = row.number
   let verses = []
   Object.keys(row).map( x => {
      if (x.match(/verse/)){
         verses.push( {
            Type: 'Verse ' + x.charAt(5),
            PartType: 0,
            PartTypeNumber: parseInt(x.charAt(5)),
            Lyrics: row[x],
            Guid: crypto.randomUUID(),
         })
         if (row.refrain){
            verses.push({
               Type: 'Refrain 1',
               PartType: 8,
               PartTypeNumber: 1,
               Lyrics: row.refrain,
               Guid: crypto.randomUUID(),
            })
         }
      }
   })
   //Hymn 140
   if (row.refrain2){
      verses.pop()
      verses.push({
         Type: 'Refrain 2',
         PartType: 8,
         PartTypeNumber: 2,
         Lyrics: row.refrain2,
         Guid: crypto.randomUUID(),
      })
   }
   //Hymn 121, (Go Tell It On The Mountain)
   if (row.number === 121) {
      verses.unshift({
         Type: 'Refrain 1',
         PartType: 8,
         PartTypeNumber: 1,
         Lyrics: row.refrain,
         Guid: crypto.randomUUID(),
      })
   }

   return                {
      CCLID: null,
      PageNumber: null,
      Tags: [],
      Copyright: [],
      Disclaimer: null,
      LyricsParts: verses.map(({Lyrics, PartType, PartTypeNumber, Guid}) => {
         return {
            Lyrics,
            PartType,
            PartTypeNumber,
            Guid,
         };
      }),
      SongID: crypto.randomUUID(),
      PlayOrder: verses.map(verse => verse.Type),
      PlayOrderWithGuids: verses.map(verse => {
         return {
            Item1: verse.Type,
            Item2: verse.Guid,
         }
      }),
      Title: number.toString(),
      SongNumber: null,
      Authors: []
   };
}

function formatToText(object) {
   return `${object.hymnNumber}\n${object.hymnTitle}\n\n${object.verses.map(x => {
          return `${x['verseName']}\n${x['text']}\n`
       }
   ).join('\n')}`;
}

function formatToHTML(object) {
   let response = `<h4>${object.hymnNumber}</h4>\n
<h4>${object.hymnTitle}</h4>\n
${object.verses.map( verse => {
      return(
          `<h5>${verse.verseName}</h5>\n
<p>${verse.text.replace(/\n/g, '<br>')}</p>\n\n`)
   }).join('')}`

   return response;
}

module.exports = function (options) {
   options.number = options.number || null;
   options.title = options.title || null;
   options.type = options.type || 'json';
   return new Promise( (resolve, reject) => {
      if (!options.number && !options.title){
         reject('Error Hymn Title (title: ) or Number (number: ) Must Be Set')
      }

      db.serialize(() => {
         db.each(`SELECT \`number\`, title, verse1, verse2, verse3, verse4, verse5, verse6, verse7, refrain, refrain2 FROM hymns WHERE ${
             options.number ? '_id = ' + options.number : 'LOWER(Title) LIKE LOWER(\''+ options.title + '\')'
         }`, (err, row) => {
            Object.keys(row).forEach(x =>{
               if (row[x] === null){
                  delete row[x];
               }
            })

            if (!row){
               reject('Error Finding Hymnal: ' + options.title ? options.title : options.number);
            }
            let response;
            if (!(response= formatRow(row))){
               reject(`Error formatting Hymn: ${options.title ? options.title : options.number}`)
            }

            if (options.type.toLowerCase() === 'json') {
               resolve(response);
            }
            else if(options.type.toLowerCase() === 'text') {
               response = formatToText(response)
               if (response){
                  resolve(response)
               } else {
                  reject(`Error formatting Hymn: ${options.title ? options.title : options.number} to text`)
               }
            }
            else if(options.type.toLowerCase() === 'html') {
               response = formatToHTML(response);
               if (response) {
                  resolve(response);
               } else {
                  reject(`Error formatting Hymn: ${options.title ? options.title : options.number} to HTML`)
               }
            }
            else {
               reject('Type: \'' + options.type + '\' Not Applicable. Please try text, json, or html');
            }
         })

      });
   })
}
