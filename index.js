// Example express application adding the parse-server module to expose Parse
// compatible API routes.

var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var S3Adapter = require('parse-server').S3Adapter;
var path = require('path');

var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;

if (!databaseUri) {
  console.log('DATABASE_URI not specified, falling back to localhost.');
}

var appName = 'You and Me Forever';
var serverUrl = process.env.SERVER_URL || 'http://localhost:1337/parse';

var api = new ParseServer({
  databaseURI: databaseUri || 'mongodb://localhost:27017/dev',
  cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
  appId: process.env.APP_ID || 'myAppId',
  masterKey: process.env.MASTER_KEY || 'masterKey',
  serverURL: serverUrl,
  liveQuery: {
    classNames: ["Posts", "Comments"] // List of classes to support for query subscriptions
  },
  appName: appName,  // Required for sending email verifications
  publicServerURL: serverUrl,  // Required for sending email verifications

  verifyUserEmails: true,
  emailAdapter: {
    module: 'parse-server-simple-mailgun-adapter',
    options: {
      fromAddress: appName + ' <' + process.env.MAILGUN_FROM_ADDRESS + '>',
      domain: process.env.MAILGUN_DOMAIN,
      apiKey: process.env.MAILGUN_API_KEY,
    }
  },

  filesAdapter: new S3Adapter(
    process.env.S3_ACCESS_KEY,
    process.env.S3_SECRET_KEY,
    process.env.S3_BUCKET,
    {directAccess: true}
  )
});


var app = express();

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// Serve the Parse API on the /parse URL prefix
var mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function(req, res) {
  res.status(200).send('I dream of being a website.  Please star the parse-server repo on GitHub!');
});

// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app.get('/test', function(req, res) {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});

var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
    console.log('parse-server-example running on port ' + port + '.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
