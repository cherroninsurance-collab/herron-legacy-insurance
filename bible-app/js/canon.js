/* LIVING WORD — the 66-book canon (metadata only; text lives in the DB).
   [id, name, abbrev, testament, genre, chapterCount]                     */

'use strict';

export const BOOKS = [
  [1,'Genesis','Gen','OT','law',50],[2,'Exodus','Ex','OT','law',40],
  [3,'Leviticus','Lev','OT','law',27],[4,'Numbers','Num','OT','law',36],
  [5,'Deuteronomy','Deut','OT','law',34],[6,'Joshua','Josh','OT','history',24],
  [7,'Judges','Judg','OT','history',21],[8,'Ruth','Ruth','OT','history',4],
  [9,'1 Samuel','1Sam','OT','history',31],[10,'2 Samuel','2Sam','OT','history',24],
  [11,'1 Kings','1Ki','OT','history',22],[12,'2 Kings','2Ki','OT','history',25],
  [13,'1 Chronicles','1Chr','OT','history',29],[14,'2 Chronicles','2Chr','OT','history',36],
  [15,'Ezra','Ezra','OT','history',10],[16,'Nehemiah','Neh','OT','history',13],
  [17,'Esther','Est','OT','history',10],[18,'Job','Job','OT','wisdom',42],
  [19,'Psalms','Ps','OT','wisdom',150],[20,'Proverbs','Prov','OT','wisdom',31],
  [21,'Ecclesiastes','Eccl','OT','wisdom',12],[22,'Song of Solomon','Song','OT','wisdom',8],
  [23,'Isaiah','Isa','OT','prophets',66],[24,'Jeremiah','Jer','OT','prophets',52],
  [25,'Lamentations','Lam','OT','prophets',5],[26,'Ezekiel','Ezek','OT','prophets',48],
  [27,'Daniel','Dan','OT','prophets',12],[28,'Hosea','Hos','OT','prophets',14],
  [29,'Joel','Joel','OT','prophets',3],[30,'Amos','Amos','OT','prophets',9],
  [31,'Obadiah','Obad','OT','prophets',1],[32,'Jonah','Jonah','OT','prophets',4],
  [33,'Micah','Mic','OT','prophets',7],[34,'Nahum','Nah','OT','prophets',3],
  [35,'Habakkuk','Hab','OT','prophets',3],[36,'Zephaniah','Zeph','OT','prophets',3],
  [37,'Haggai','Hag','OT','prophets',2],[38,'Zechariah','Zech','OT','prophets',14],
  [39,'Malachi','Mal','OT','prophets',4],
  [40,'Matthew','Matt','NT','gospel',28],[41,'Mark','Mark','NT','gospel',16],
  [42,'Luke','Luke','NT','gospel',24],[43,'John','John','NT','gospel',21],
  [44,'Acts','Acts','NT','acts',28],[45,'Romans','Rom','NT','epistle',16],
  [46,'1 Corinthians','1Cor','NT','epistle',16],[47,'2 Corinthians','2Cor','NT','epistle',13],
  [48,'Galatians','Gal','NT','epistle',6],[49,'Ephesians','Eph','NT','epistle',6],
  [50,'Philippians','Phil','NT','epistle',4],[51,'Colossians','Col','NT','epistle',4],
  [52,'1 Thessalonians','1Th','NT','epistle',5],[53,'2 Thessalonians','2Th','NT','epistle',3],
  [54,'1 Timothy','1Tim','NT','epistle',6],[55,'2 Timothy','2Tim','NT','epistle',4],
  [56,'Titus','Titus','NT','epistle',3],[57,'Philemon','Phlm','NT','epistle',1],
  [58,'Hebrews','Heb','NT','epistle',13],[59,'James','Jas','NT','epistle',5],
  [60,'1 Peter','1Pet','NT','epistle',5],[61,'2 Peter','2Pet','NT','epistle',3],
  [62,'1 John','1Jn','NT','epistle',5],[63,'2 John','2Jn','NT','epistle',1],
  [64,'3 John','3Jn','NT','epistle',1],[65,'Jude','Jude','NT','epistle',1],
  [66,'Revelation','Rev','NT','apocalyptic',22],
];

export const bookById = (id) => BOOKS.find((b) => b[0] === id);
export const bookName = (id) => (bookById(id) || [])[1] || '?';
export const chapterCount = (id) => (bookById(id) || [])[5] || 0;
