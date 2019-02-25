// Server-related tasks

// core dependencies
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var fs = require('fs');
var path = require('path');
var util = require('util');
var debug = util.debuglog('server');

// local dependencies
var config = require('./config');
var handlers = require('./handlers');
var helpers = require('./helpers');

// Instantiate the server module object
var server = {};

// Instantiate the HTTPS server
server.httpsServerOptions = {
  'key': fs.readFileSync(path.join(__dirname,'/../server/https.options/key.pem')),
  'cert': fs.readFileSync(path.join(__dirname,'/../server/https.options/cert.pem'))
};
server.httpsServer = https.createServer(server.httpsServerOptions,function(req,res){
  // Parse the url
  var parsedUrl = url.parse(req.url, true);

  // Get the path
  var path = parsedUrl.pathname;
  var trimmedPath = path.replace(/^\/+|\/+$/g, '');
  
  // Get the query string as an object
  var queryStringObject = parsedUrl.query;

  // Get the HTTP method
  var method = req.method.toLowerCase();

  //Get the headers as an object
  var headers = req.headers;

  // Get the payload,if any
  var decoder = new StringDecoder('utf-8');
  var buffer = '';
  req.on('data', function(data) {
      buffer += decoder.write(data);
  });
  req.on('end', function() {
      buffer += decoder.end();

      // Check for a matching path for a handler, use notFound handler as default
      var chosenHandler = '';
      switch ( trimmedPath ) { 
        case ''               : chosenHandler = handlers.template; break;
        
        case 'account/create' : chosenHandler = handlers.template; break;
        case 'account/edit'   : chosenHandler = handlers.template; break;
        case 'account/delete' : chosenHandler = handlers.template; break;
        case 'account/deleted': chosenHandler = handlers.template; break;
        
        case 'session/create'  : chosenHandler = handlers.template; break;
        case 'session/deleted' : chosenHandler = handlers.template; break;

        case 'orders'          : chosenHandler = handlers.template; break;
        case 'order'           : chosenHandler = handlers.template; break;
        case 'orders/menu'     : chosenHandler = handlers.template; break;

        case 'api/users'          : chosenHandler = handlers.users; break;
        case 'api/tokens'         : chosenHandler = handlers.tokens; break;
        case 'api/menu'           : chosenHandler = handlers.menu; break;
        case 'api/orders'         : chosenHandler = handlers.orders; break;
        case 'api/orders.payments': chosenHandler = handlers.payments; break;
        default               : 
          if (trimmedPath.indexOf('staticAssets') > -1 ){
            chosenHandler = handlers.static; break;
          } else {
            chosenHandler = handlers.notFound; break;
          }
      }

      // Construct the data object to send to the handler
      var data = {
        'trimmedPath' : trimmedPath,
        'queryStringObject' : queryStringObject,
        'method' : method,
        'headers' : headers,
        'payload' : helpers.parseJsonToObject(buffer)
      };
      
      // Route the request to the handler specified in the router
      chosenHandler(data,function(statusCode,payload, contentType){ // function is callback, gets args from specific handler by callback(code, payload)
        
        // Use the status code returned from the handler, or set the default status code to 200
        statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

        // Return the response parts that are content-type specific
        var payloadString = '';

        // Use the contentType returned from the handler, or set the default to json when writing headers
        switch (contentType) {
          case 'html':
            res.setHeader('Content-Type', 'text/html');
            payloadString = typeof(payload) == 'string'? payload : '';
            break;
          case 'jpg':
            res.setHeader('Content-Type', 'image/jpeg');
            payloadString = typeof(payload) !== 'undefined' ? payload : '';
            break;
          case 'png':
            res.setHeader('Content-Type', 'image/png');
            payloadString = typeof(payload) !== 'undefined' ? payload : '';
            break;
          case 'svg':
            res.setHeader('Content-Type', 'image/svg');
            payloadString = typeof(payload) !== 'undefined' ? payload : '';
            break;
          case 'css':
            res.setHeader('Content-Type', 'text/css');
            payloadString = typeof(payload) !== 'undefined' ? payload : '';
            break;
          case 'plain':
            res.setHeader('Content-Type', 'text/plain');
            payloadString = typeof(payload) !== 'undefined' ? payload : '';
            break;
          case 'favicon':
            res.setHeader('Content-Type', 'image/x-icon');
            payloadString = typeof(payload) !== 'undefined' ? payload : '';
            break;
          default:
            contentType = 'json';
            res.setHeader('Content-Type', 'application/json');
            payload = typeof(payload) == 'object'? payload : {};
            payloadString = JSON.stringify(payload);
        }

        // Return the response
        res.writeHead(statusCode);
        res.end(payloadString);
        
        // If the response is 200, print green, otherwise print red
        if(statusCode == 200){
          debug('\x1b[32m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
        } else {
          debug('\x1b[31m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
        }
      });

  });
});

// Init script
server.init = function(){
  // Start the HTTPS server
  server.httpsServer.listen(config.httpsPort,function(){
    console.log('\x1b[35m%s\x1b[0m','The HTTPS server is running on port '+config.httpsPort);
  });
};

// Export the module
module.exports = server;
