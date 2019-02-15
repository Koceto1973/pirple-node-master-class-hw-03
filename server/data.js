// data functions

// Dependencies
var fs = require('fs');
var path = require('path');
var helpers = require('./helpers');

// Container for module (to be exported)
var data = {};

// Base directory of data folder
data.baseDir = path.join(__dirname,'/.data/');

// Write data to a file
data.create = function(dir,file,_data,callback){ // calback(false)
  // Open the file for writing
  fs.open(data.baseDir+dir+'/'+file+'.json', 'wx', function(err, fileDescriptor){
    if(!err && fileDescriptor){
      // Convert data to string
      var stringData = JSON.stringify(_data);

      // Write to file and close it
      fs.writeFile(fileDescriptor, stringData,function(err){
        if(!err){
          fs.close(fileDescriptor,function(err){
            if(!err){
              callback(false);
            } else {
              callback('Error closing new file');
            }
          });
        } else {
          callback('Error writing to new file');
        }
      });
    } else {
      callback('Could not create new file, it may already exist');
    }
  });

};

// Read data from a file
data.read = function(dir,file,callback){ // callback(false,parsedData);
  fs.readFile(data.baseDir+dir+'/'+file+'.json', 'utf8', function(err,data){
    if(!err && data){
      var parsedData = helpers.parseJsonToObject(data);
      callback(false,parsedData);
    } else {
      callback(err,data);
    }
  });
};

// Update data in a file
data.update = function(dir,file,_data,callback){ // callback(false);

  // Open the file for writing
  fs.open(data.baseDir+dir+'/'+file+'.json', 'r+', function(err, fileDescriptor){
    if(!err && fileDescriptor){
      // Convert data to string
      var stringData = JSON.stringify(_data);

      // Truncate the file
      fs.ftruncate(fileDescriptor,function(err){
        if(!err){
          // Write to file and close it
          fs.writeFile(fileDescriptor, stringData,function(err){
            if(!err){
              fs.close(fileDescriptor,function(err){
                if(!err){
                  callback(false);
                } else {
                  callback('Error closing existing file');
                }
              });
            } else {
              callback('Error writing to existing file');
            }
          });
        } else {
          callback('Error truncating file');
        }
      });
    } else {
      callback('Could not open file for updating, it may not exist yet');
    }
  });

};

// Delete a file
data.delete = function(dir,file,callback){

  // Unlink the file from the filesystem
  fs.unlink(data.baseDir+dir+'/'+file+'.json', function(err){
    callback(err);
  });

};

// List all the items in a directory
data.list = function(dir,callback){
  fs.readdir(data.baseDir+dir+'/', function(err,_data){
    if(!err && data && data.length > 0){
      var trimmedFileNames = [];
      _data.forEach(function(fileName){
        trimmedFileNames.push(fileName.replace('.json',''));
      });
      callback(false,trimmedFileNames);
    } else {
      callback(err,_data);
    }
  });
};

// Export the module
module.exports = data;