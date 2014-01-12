
function createTables() {
  db.transaction(function(transaction) {
    transaction.executeSql('DROP TABLE IF EXISTS books;',[],function() {}, dbError);
    transaction.executeSql('DROP TABLE IF EXISTS authors;',[],function() {}, dbError);
    transaction.executeSql('DROP TABLE IF EXISTS series;',[],function() {}, dbError);
    transaction.executeSql('DROP TABLE IF EXISTS freeText;',[],function() {}, dbError);
    transaction.executeSql('DROP TABLE IF EXISTS stories;',[],function() {}, dbError);
    transaction.executeSql('DROP TABLE IF EXISTS authorLink;',[],function() {}, dbError);
    transaction.executeSql('DROP TABLE IF EXISTS storyBookLink;',[],function() {}, dbError);
    transaction.executeSql('DROP TABLE IF EXISTS storyAuthorLink;',[],function() {}, dbError);
    transaction.executeSql('CREATE TABLE IF NOT EXISTS books ' +
                           '  (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
                           '   title TEXT NOT NULL, ' +
                           '   isbn TEXT NOT NULL, ' +
                           '   freeText INTEGER UNSIGNED, ' +
                           '   seriesId INTEGER UNSIGNED, ' +
                           '   numberInSeries INTEGER UNSIGNED, ' +
                           '   img TEXT, ' +
                           '   amazonURL TEXT);',[],function() {}, dbError);
    transaction.executeSql('CREATE TABLE IF NOT EXISTS authors ' +
                           '  (id INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
                           '   surname TEXT NOT NULL, ' +
                           '   forenames TEXT NOT NULL);',[],function() {}, dbError);
    transaction.executeSql('CREATE TABLE IF NOT EXISTS series ' +
                           '  (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
                           '   title TEXT NOT NULL);',[],function() {}, dbError);
    transaction.executeSql('CREATE TABLE IF NOT EXISTS freeText ' +
                           '  (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
                           '   text TEXT NOT NULL);',[],function() {}, dbError);
    transaction.executeSql('CREATE TABLE IF NOT EXISTS stories ' +
                           '  (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
                           '   title TEXT NOT NULL);',[],function() {}, dbError);
    transaction.executeSql('CREATE TABLE IF NOT EXISTS authorLink ' +
                           '  (bookId INTEGER UNSIGNED NOT NULL, ' +
                           '   authorId INTEGER UNSIGNED NOT NULL);',[],function() {}, dbError);
    transaction.executeSql('CREATE TABLE IF NOT EXISTS storyBookLink ' +
                           '  (bookId INTEGER UNSIGNED NOT NULL, ' +
                           '   storyId INTEGER UNSIGNED NOT NULL);',[],function() {}, dbError);
    transaction.executeSql('CREATE TABLE IF NOT EXISTS storyAuthorLink ' +
                           '  (storyId INTEGER UNSIGNED NOT NULL, ' +
                           '   authorId INTEGER UNSIGNED NOT NULL);',[],function() {}, dbError);
    }); 

  }


function storyDict(story) {
  var title = $(story).children('title').text();
  var authors = [];
  $(story).find('author').each(function() { authors.push(author($(this))); });
  return { title: title, id: undefined, authors: authors };
  }

function author(authorNode) {
  return { surname: $(authorNode).find('surname').text(), forenames: $(authorNode).find('forenames').text(), id: undefined }
  }

function addBook(tx,bookObjs) {
  var bookObj = bookObjs.shift();
  var title = $(bookObj).children('title').text();
  if ((bookObjs.length % 25) == 0) 
    { progress(title,bookObjs.length); }
  var series = $(bookObj).children('series').text();
  var numberInSeries = $(bookObj).find('numberInSeries').text();
  var isbn = $(bookObj).find('isbn').text();
  var img = $(bookObj).find('image').text();
  var amazonURL = $(bookObj).find('amazonURL').text();
  var authors = [];
  var stories = [];
  $(bookObj).children('author').each(function() { authors.push(author($(this))); });
  $(bookObj).find('story').each(function() { stories.push(storyDict($(this))); });

  var book = {title: title, id: undefined, 
              authors: authors, 
              series: { title: series, id: undefined, numberInSeries: numberInSeries}, 
              isbn: isbn, 
              img: img, 
              amazonURL: amazonURL, 
              stories: stories}; 

  addSeries(tx,bookObjs,book);
  }

function addSeries(tx,bookObjs,book) {
  if (!book.series.id && (book.series.title != "")) {
    tx.executeSql('SELECT id FROM series where title=?',
                  [book.series.title],
                  function(tx,results) { insertSeries(tx,bookObjs,book,results); },
		  dbError);
    } else {
    addTitle(tx,bookObjs,book);
    }
  }

function insertSeries(tx,bookObjs,book,results) {
  if (results.rows.length == 0) {
    tx.executeSql('INSERT INTO series (title) VALUES (?)',
                  [book.series.title],
                  function(tx,results) { book.series.id = results.insertId; 
                                         addTitle(tx,bookObjs,book); },
                  dbError); 
    } else {
    book.series.id = results.rows.item(0).id;
    addTitle(tx,bookObjs,book);
    }
  }

function addTitle(tx,bookObjs,book) {
  tx.executeSql('INSERT INTO books (title,seriesId,numberInSeries,isbn,img,amazonURL) VALUES(?,?,?,?,?,?)',
                [book.title, book.series.id, book.series.numberInSeries, book.isbn, book.img, book.amazonURL],
                function(tx,results) { book.id = results.insertId;
                                       addBookAuthors(tx,bookObjs,book,copyArray(book.authors));
                                       },
                dbError);
  }


function copyArray(arr) {
  var result = [];
  for (var i=0; i<arr.length;i++) { result.push(arr[i]); }
  return result;
  }

function addBookAuthors(tx,bookObjs,book,toDo) {
  if (toDo.length > 0) {
    addBookAuthor(tx,bookObjs,book,toDo);
    } else {
    addStories(tx,bookObjs,book,copyArray(book.stories));
    }
  }

function addBookAuthor(tx,bookObjs,book,toDo) {
    tx.executeSql('SELECT id from authors where (surname = ? and forenames = ?)',
                  [toDo[0].surname,toDo[0].forenames],
                  function(tx,results) { insertAuthor(tx,bookObjs,book,toDo,results); },
                  dbError);
  }

function insertAuthor(tx,bookObjs,book,toDo,results) {
  if (results.rows.length == 0) { 
    tx.executeSql('INSERT INTO authors (surname,forenames) VALUES(?,?)',
                  [toDo[0].surname, toDo[0].forenames],
                  function(tx,results) { toDo[0].id = results.insertId; 
                                         linkBookAuthor(tx,bookObjs,book,toDo); 
                                         },
                  dbError);
    } else {
    toDo[0].id = results.rows.item(0).id;
    linkBookAuthor(tx,bookObjs,book,toDo);
    }
  }


function linkBookAuthor(tx,bookObjs,book,toDo) {
  tx.executeSql('INSERT INTO authorLink (bookId,authorId) VALUES(?,?)',
                [book.id, toDo[0].id],
                function(tx,results) { toDo.shift();
                                       addBookAuthors(tx,bookObjs,book,toDo); },
                dbError);
  }
  
function addStories(tx, bookObjs,book, toDo) {
  if (toDo.length > 0) {
    tx.executeSql('SELECT id from stories where (title = ?)',
                  [toDo[0].title],
                  function(tx,results) { insertStory(tx,bookObjs,book,toDo,results); },
                  dbError);
    } else {
    addBooks(tx,bookObjs);
    }
  }

function insertStory(tx,bookObjs,book,toDo,results) {
  if (results.rows.length == 0) {
    tx.executeSql('INSERT INTO stories (title) VALUES(?)',
                  [toDo[0].title],
                  function(tx,results) { toDo[0].id = results.insertId;
                                         linkStory(tx,bookObjs,book,toDo);
                                         },
                  dbError);
    } else {
    toDo[0].id = results.rows.item(0).id;
    linkStory(tx,bookObjs,book,toDo);
    }
  }

function linkStory(tx,bookObjs,book,toDo) {
  tx.executeSql('INSERT INTO storyBookLink (bookId,storyId) VALUES(?,?)',
                [book.id, toDo[0].id],
                function(tx,results) { addStoryAuthors(tx,bookObjs,book,toDo,copyArray(toDo[0].authors)); },
                dbError);
  }

function addStoryAuthors(tx,bookObjs,book,stories,toDo) {
  if (toDo.length > 0) {
    addStoryAuthor(tx,bookObjs,book,stories,toDo);
    } else {
    stories.shift();
    addStories(tx,bookObjs,book,stories);
    }
  }
  
function addStoryAuthor(tx,bookObjs,book,stories,toDo) {
    tx.executeSql('SELECT id from authors where (surname = ? and forenames = ?)',
                  [toDo[0].surname,toDo[0].forenames],
                  function(tx,results) { insertStoryAuthor(tx,bookObjs,book,stories,toDo,results); },
                  dbError);
  }

function insertStoryAuthor(tx,bookObjs,book,stories,toDo,results) {
  if (results.rows.length == 0) { 
    tx.executeSql('INSERT INTO authors (surname,forenames) VALUES(?,?)',
                  [toDo[0].surname, toDo[0].forenames],
                  function(tx,results) { toDo[0].id = results.insertId; 
                                         linkStoryAuthor(tx,bookObjs,book,stories,toDo); 
                                         },
                  dbError);
    } else {
    toDo[0].id = results.rows.item(0).id;
    linkStoryAuthor(tx,bookObjs,book,stories,toDo);
    }
  }


function linkStoryAuthor(tx,bookObjs,book,stories,toDo) {
  tx.executeSql('INSERT INTO storyAuthorLink (storyId,authorId) VALUES(?,?)',
                [stories[0].id, toDo[0].id],
                function(tx,results) { toDo.shift();
                                       addStoryAuthors(tx,bookObjs,book,stories,toDo); },
                dbError);
  }
  
function linkBookAuthors(tx,bookObjs,book,authors) {
  if (authors.length > 0) {
    var author = authors.shift();
    tx.executeSql('INSERT INTO authorLink (bookId,authorId) VALUES (?,?)',
                  [book.id,author.id],
                  function(tx,results) { linkBookAuthors(tx,bookObjs,book,authors); },
                  dbError);
    } else {
    linkStoryAuthors(tx,bookObjs,book,copyArray(book.stories));
    }
  }

function importXml(xml,progress) {
  alert('Importing');
  createTables();
  var books = [];
  $(xml).find('book').each(function() { books.push($(this)); });
  db.transaction(function(tx) { addBooks(tx,books); }); 
  alert('done Importing');
  }

function addBooks(tx,books) {
  if (books.length > 0) {
    addBook(tx,books);
    } else {
    removeProgress('done');
    }
  }

function authorSearch(authorId,callback) {
  db.transaction(function(tx) {
                   tx.executeSql('SELECT a.id AS authorId, a.surname, a.forenames, b.id AS titleId, b.title ' +
                                    'FROM books AS b ' +
                                    'JOIN authorLink AS l ON l.bookId = b.id ' +
                                    'JOIN authors AS a ON l.authorId = a.id ' +
                                    'LEFT JOIN series AS s ON b.seriesId = s.id ' +
                                    'WHERE a.id = ? ' +
                                    'ORDER BY b.title' ,
                                 [authorId],
                                 function(tx,results) { var books = [];
                                                        for(var i = 0; i < results.rows.length; i++) {
                                                          var row = results.rows.item(i);
                                                          books.push({surname: row.surname,
                                                                      forenames: row.forenames,
                                                                      title: row.title,
                                                                      titleId: row.titleId,
                                                                      authorId: row.authorId});
                                                          };
                                                        callback(books); },
                                 dbError); });
  }
                                 

function bookFromId(bookId,callback) {
  db.transaction(function(tx) {
                   tx.executeSql('SELECT b.title, b.seriesId, s.title as seriesTitle, b.numberInSeries, b.isbn, b.img, b.amazonURL ' +
                                   'FROM books AS b ' +
                                   'LEFT JOIN series AS s ON b.seriesId = s.id ' +
                                   'WHERE b.id = ?',
                                 [bookId],
                                 function(tx,results) { var result = results.rows.item(0);
                                                        var book = { id: bookId, title: result.title, 
                                                                     isbn: result.isbn, amazonURL: result.amazonURL, 
                                                                     img: result.img,
                                                                     authors: [],
                                                                     stories: [], 
                                                                     series: { id: result.seriesId, title: result.seriesTitle, numberInSeries: result.numberInSeries }
                                                                   };
                                                        populateAuthors(tx,book,callback);
                                                        },
                                 dbError);
                   });
  }

function populateAuthors(tx,book,callback) {
  tx.executeSql('SELECT a.surname, a.forenames ' +
                  'FROM authors AS a ' +
                  'JOIN authorLink AS l ON l.authorId = a.id ' +
                  'JOIN books AS b ON l.bookId = b.id ' +
                  'WHERE b.id = ? ' +
                  'ORDER BY a.surname, a.forenames',
                [book.id],
                function(tx,results) { for(var i=0; i<results.rows.length; i++) {
                                         book.authors.push( {surname: results.rows.item(i).surname, forenames: results.rows.item(i).forenames } );
                                         }
                                       populateStories(tx, book, callback);
                                       },
                dbError);
  }

function populateStories(tx,book,callback) {
  tx.executeSql('SELECT s.id, s.title ' +
                  'FROM stories as s ' +
                  'JOIN storyBookLink AS l ON l.storyId = s.id '+
                  'JOIN books AS b ON l.bookId = b.id '+
                  'WHERE b.id = ? ' +
                  'ORDER BY s.title',
                [book.id],
                function(tx,results) { var stories = [];
                                       for (var i=0; i<results.rows.length; i++) {
                                         stories.push({id: results.rows.item(i).id, title: results.rows.item(i).title, authors: []});
                                         }
                                       populateStoryAuthors(tx,book,stories,callback);
                                       },
                dbError);
  }

function populateStoryAuthors(tx,book,stories,callback) {
  if (stories.length > 0) {
    var story = stories.shift();
    tx.executeSql('SELECT a.id, a.surname, a.forenames ' +
                    'FROM authors AS a ' +
                    'JOIN storyAuthorLink AS l ON l.authorId = a.id ' +
                    'JOIN stories AS s ON l.storyId = s.id ' +
                    'WHERE s.id = ? ' +
                    'ORDER BY a.surname, a.forenames',
                  [story.id],
                  function(tx,results) { for(var i=0; i<results.rows.length; i++) {
                                           story.authors.push({id: results.rows.item(i).id, surname: results.rows.item(i).surname, forenames: results.rows.item(i).forenames});
                                           }
                                         book.stories.push(story);
                                         populateStoryAuthors(tx,book,stories,callback);
                                         },
                  dbError);
    } else {
    callback(book);
    }
  }

function bookIdSearch(bookId,callback) {
  db.transaction(function(tx) {
                   tx.executeSql('SELECT a.id AS authorId, a.surname, a.forenames, b.id AS titleId, b.title, b.seriesId, s.title as seriesTitle, b.numberInSeries, ' +
                                    '    b.isbn, b.img, b.amazonURL ' +
                                    'FROM books AS b ' +
                                    'JOIN authorLink AS l ON l.bookId = b.id ' +
                                    'JOIN authors AS a ON l.authorId = a.id ' +
                                    'LEFT JOIN series AS s ON b.seriesId = s.id ' +
                                    'WHERE b.id = ? ' +
                                    'ORDER BY a.surname, a.forenames' ,
                                 [bookId],
                                 function(tx,results) { var book = {};
                                                        var authors = [];
                                                        for(var i = 0; i < results.rows.length; i++) {
                                                          var row = results.rows.item(i);
                                                          authors.push({ surname: row.surname,
                                                                         forenames: row.forenames,
                                                                         authorId: row.authorId });
                                                          book.title = row.title;
                                                          book.seriesTitle = row.seriesTitle;
                                                          book.numberInSeries = row.numberInSeries;
                                                          book.isbn = row.isbn;
                                                          book.img = row.img;
                                                          book.amazonURL = row.amazonURL;
                                                          book.seriesId = row.seriesId;
                                                          };
                                                        callback(book,authors); },
                                 dbError); });
  }
                                 
function basicBookSearch(searchString,callback) {
  var sqlSearchString = '%' + searchString + '%';
  db.transaction(function(tx) {
                   tx.executeSql('SELECT a.id AS authorId, a.surname, a.forenames, b.id AS titleId, b.title  ' +
                                    'FROM books AS b ' +
                                    'JOIN authorLink AS l ON l.bookId = b.id ' +
                                    'JOIN authors AS a ON l.authorId = a.id ' +
                                    'LEFT JOIN series AS s ON b.seriesId = s.id ' +
                                    'WHERE a.surname LIKE ? ' +
                                    '   OR a.forenames LIKE ? ' +
                                    '   OR b.title LIKE ? ' +
                                    '   OR b.isbn LIKE ? ' +
                                    'ORDER BY a.surname, a.forenames, b.title' ,
                                 [sqlSearchString,sqlSearchString,sqlSearchString,sqlSearchString],
                                 function(tx,results) { var books = [];
                                                        for(var i = 0; i < results.rows.length; i++) {
                                                          var row = results.rows.item(i);
                                                          books.push({surname: row.surname,
                                                                      forenames: row.forenames,
                                                                      title: row.title,
                                                                      titleId: row.titleId,
                                                                      authorId: row.authorId});
                                                          };
                                                        callback(books); },
                                 dbError);
                   });
  }
;
