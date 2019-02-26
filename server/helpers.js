// Helpers for various tasks

// Dependencies
const config = require('./config');
const https = require('https');
const crypto = require('crypto');
const querystring = require('querystring');
const path = require('path');
const fs = require('fs');

// Container for all the helpers
var helpers = {};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = function(str){
  try{
    var obj = JSON.parse(str);
    return obj;
  } catch(e){
    return {};
  }
};

// Create a SHA256 hash
helpers.hash = function(str){
  if(typeof(str) == 'string' && str.length > 0){
    var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    return hash;
  } else {
    return false;
  }
};

// Create a string of random alphanumeric characters, of a given length
helpers.createRandomString = function(strLength){
  strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
  if(strLength){
    // Define all the possible characters that could go into a string
    var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    // Start the final string
    var str = '';
    for(i = 1; i <= strLength; i++) {
        // Get a random charactert from the possibleCharacters string
        var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
        // Append this character to the string
        str+=randomCharacter;
    }
    // Return the final string
    return str;
  } else {
    return false;
  }
};

// verify pizza order
// at least one
// max five per model
// max twenty total
helpers.verifyOrder = function(order){
  let count = 0;
  let acceptable = true;
  Array.prototype.forEach.call(order, (item)=>{
    if( item<0 || item>5 ) { acceptable = false; }
    count +=item;
  });

  // at least one and max twenty
  if( count>0 && count<21 && acceptable) {
    return true;
  } else {
    return false;
  }  
};

// test payment using dummy user card details and dummy stripe auth key
helpers.createStripePayment = function(token,amount,callback){

  var requestOptions = {
    "protocol": "https:",
    "method": "POST",
    "hostname": "api.stripe.com",
    "path": "/v1/charges",
    "headers": {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Bearer sk_test_4eC39HqLyjWDarjtT1zdp7dc",
    }
  };

  // Instantiate the request object
  var req = https.request(requestOptions,function(res){

    var chunks = [];
    
    res.on("data", function (chunk) {
      chunks.push(chunk);
    });

    res.on("end", function () {
      // get the payment id
      var id = JSON.parse(Buffer.concat(chunks)).id;

      // Grab the status of the sent request
      var status =  res.statusCode;
      // Callback successfully if the request went through
      if(status == 200 || status == 201){
        callback(false,{'paymentId':id});
      } else {
        callback(status,{'Error':'Failed processing the Stripe payment correctly'});
      }
    });    
  });

  // Bind to the error event so it doesn't get thrown
  req.on('error',function(e){
    callback(500,e);
  });

  let queries = {
    source: token,
    amount: amount,
    currency: 'usd',
    description: 'Test Stripe Charge',
  }

  // write query string object
  req.write(querystring.stringify(queries));

  // End the request, actual sending of the request
  req.end();
};

// calculates the ttl amount in cents, based on ordered pizzas and their prices
helpers.calculatePaymentAmount = function(order){
  var prices = [2.90,3.60,3.30,3.70,2.80,4.20,3.40,3.50,3.20,3.60,4.20,3.50,3.60,4.30,4.00,3.90,4.20];
  var amount = 0;
  var index = 0;

  Array.prototype.forEach.call(order,(el)=>{
    amount += el*prices[index];
    index++;
  });
  
  return Math.ceil(amount*100);
};

// email notification on completed pizza order payment
helpers.createMailgunNotification = function(email, notification, callback){
  var requestOptions = {
    "protocol": "https:",
    "method": "POST",
    "hostname": "api.mailgun.net",
    "path": `/v3/${config.domainNameMailgun}/messages`,
    "headers": {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": 'Basic ' + Buffer.from('api' + ':' + config.apiKeyMailgun).toString('base64'),
    }
  };

  // Instantiate the request object
  var req = https.request(requestOptions,function(res){

    var chunks = [];
    
    res.on("data", function (chunk) {
      chunks.push(chunk);
    });

    res.on("end", function () {
      // Grab the status of the sent request
      var status =  res.statusCode;
      // Callback successfully if the request went through
      if(status == 200 || status == 201){
        callback(false,{'Success':"Check your email for payment details"});
      } else {
        callback(status,{'Error':'Failed to send email notification for your payment'});
      }
    });    
  });

  // Bind to the error event so it doesn't get thrown
  req.on('error',function(e){
    callback(500,e);
  });

  let queries = {
    from: `mailgun@${config.domainNameMailgun}`,
    to: 'teamk.developers@gmail.com',
    subject: 'pizza order payment',
    text: notification,
  }

  // write query string object
  req.write(querystring.stringify(queries));

  // End the request, actual sending of the request
  req.end();
};

// Get the string content of a template, and use provided templateData for string interpolation
helpers.getTemplate = function(templateData,callback){
  templateData = typeof(templateData) == 'object' && templateData !== null ? templateData : {};
  var tempData = JSON.parse(JSON.stringify(templateData));
  var templateName = typeof(tempData.templateName) == 'string' && tempData.templateName.length > 0 ? tempData.templateName : false;

  if(templateName){
    var templatesDir = path.join(__dirname,'/templates/');
    fs.readFile(templatesDir+templateName+'.html', 'utf8', function(err,str){
      if(!err && str && str.length > 0){
        // Do interpolation on the string
        var finalString = helpers.interpolate(str,tempData);
        callback(false,finalString);
      } else {
        callback(true,'No template could be found');
      }
    });
  } else {
    callback(true,'A valid template name was not specified');
  }
};

// Add the universal header and footer to a string, and pass provided data object to header and footer for interpolation
helpers.addUniversalTemplates = function(str,templateData,callback){
  str = typeof(str) == 'string' && str.length > 0 ? str : ''; 
  templateData = typeof(templateData) == 'object' && templateData !== null ? templateData : {};
  var tempData = JSON.parse(JSON.stringify(templateData));

  // Get the header
  tempData.templateName = '_header';
  helpers.getTemplate(tempData,function(err,headerString){
    if(!err && headerString){
      // Get the footer
      tempData.templateName = '_footer';
      helpers.getTemplate(tempData,function(err,footerString){
        if(!err && headerString){
          // Add them all together
          var fullString = headerString+str+footerString;
          callback(false,fullString);
        } else {
          callback('Could not find the footer template');
        }
      });
    } else {
      callback('Could not find the header template');
    }
  });
};

// Take a given string and data object, and find/replace all the keys within it
helpers.interpolate = function(str,templateData){
  str = typeof(str) == 'string' && str.length > 0 ? str : '';
  templateData = typeof(templateData) == 'object' && templateData !== null ? templateData : {};
  var tempData = JSON.parse(JSON.stringify(templateData));

  // Add the templateGlobals to the data object, prepending their key name with "global."
  for(var keyName in config.templateGlobals){
     if(config.templateGlobals.hasOwnProperty(keyName)){
      tempData['global.'+keyName] = config.templateGlobals[keyName] // done 3 times
     }
  }
  // For each key in the data object, insert its value into the string at the corresponding placeholder
  for(var key in tempData){
     if(tempData.hasOwnProperty(key) && typeof(tempData[key] == 'string')){
      str = str.replace('{'+key+'}',tempData[key]);
     }
  }
  return str;
};

// Get the contents of a static (public) asset
helpers.getStaticAsset = function(fileName,callback){ // callback(false,data);
  fileName = typeof(fileName) == 'string' && fileName.length > 0 ? fileName : false;
  if(fileName){
    var publicDir = path.join(__dirname,'/staticAssets/'); 
    fs.readFile(publicDir+fileName, function(err,data){
      if(!err && data){
        callback(false,data);
      } else {
        callback('No file could be found');
      }
    });
  } else {
    callback('A valid file name was not specified');
  }
};

// Export the module
module.exports = helpers;