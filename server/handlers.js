// Request Handlers

// Dependencies
var _data = require('./data');
var helpers = require('./helpers');
var config = require('./config');

// Define all the handlers
var handlers = {};

// Users
handlers.users = function(data,callback){ // from data.method desides which of handlers._users(data, callback) to run
  var acceptableMethods = ['post','get','put','delete'];
  if(acceptableMethods.indexOf(data.method) > -1){
    handlers._users[data.method](data,callback);
  } else {
    callback(405);
  }
};

// Container for all the users methods
handlers._users  = {};

// Users - post
// Required data: name, email, address, password
// Optional data: none
handlers._users.post = function(data,callback){ // callback(200)
  // Check that all required fields are filled out
  var name = typeof(data.payload.name) == 'string' && data.payload.name.trim().length > 0 ? data.payload.name.trim() : false;
  var email = typeof(data.payload.email) == 'string' && data.payload.email.trim().length > 5 ? data.payload.email.trim() : false;
  var address = typeof(data.payload.address) == 'string' && data.payload.address.trim().length > 10 ? data.payload.address.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  
  if(name && email && password && address){
    // Make sure the user doesnt already exist
    _data.read('users',email,function(err,data){
      if(err){
        // Hash the password
        var hashedPassword = helpers.hash(password);

        // Create the user object
        if(hashedPassword){
          var userObject = {
            'name' : name,
            'email' : email,
            'address' : address,
            'hashedPassword' : hashedPassword
          };

          // Store the user
          _data.create('users',email,userObject,function(err){
            if(!err){
              callback(200);
            } else {
              callback(500,{'Error' : 'Could not create the new user'});
            }
          });
        } else {
          callback(500,{'Error' : 'Could not hash the user\'s password.'});
        }

      } else {
        // User alread exists
        callback(400,{'Error' : 'A user with that email number already exists'});
      }
    });

  } else {
    callback(400,{'Error' : 'Missing required fields'});
  }

};

// Required data: email, token
// Optional data: none
// should post token first, then get is responsable
handlers._users.get = function(data,callback){ // callback(200, userdata without hashed password )
  // Check that email is valid string
  var email = typeof(data.queryStringObject.email) == 'string' ? data.queryStringObject.email.trim() : false;
  if(email){

    // Get token from headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token,email,function(tokenIsValid){ // true or false
      if(tokenIsValid){
        // Lookup the user
        _data.read('users',email,function(err,data){
          if(!err && data){
            // Remove the hashed password from the user object (just not to be shown in response) before returning it to the requester
            delete data.hashedPassword;
            callback(200,data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403,{"Error" : "Missing required token in header, or token is invalid."})
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'})
  }
};

// Required data: email, token
// Optional data: name, address, password (at least one must be specified)
handlers._users.put = function(data,callback){ // callback(200)
  // Check for required field
  var email = typeof(data.payload.email) == 'string' ? data.payload.email.trim() : false;

  // Check for optional fields
  var name = typeof(data.payload.name) == 'string' && data.payload.name.trim().length > 0 ? data.payload.name.trim() : false;
  var address = typeof(data.payload.address) == 'string' && data.payload.address.trim().length > 0 ? data.payload.address.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  // Error if phone is invalid
  if(email){
    // Error if nothing is sent to update
    if(name || address || password){

      // Get token from headers
      var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
      
      // Verify that the given token is valid for the email
      handlers._tokens.verifyToken(token,email,function(tokenIsValid){
        if(tokenIsValid){

          // Lookup the user
          _data.read('users',email,function(err,userData){
            if(!err && userData){
              // Update the fields if necessary
              if(name){
                userData.name = name;
              }
              if(address){
                userData.address = address;
              }
              if(password){
                userData.hashedPassword = helpers.hash(password);
              }
              // Store the new updates
              _data.update('users',email,userData,function(err){
                if(!err){
                  callback(200);
                } else {
                  callback(500,{'Error' : 'Could not update the user.'});
                }
              });
            } else {
              callback(400,{'Error' : 'Specified user does not exist.'});
            }
          });
        } else {
          callback(403,{"Error" : "Missing required token in header, or token is invalid."});
        }
      });
    } else {
      callback(400,{'Error' : 'Missing fields to update.'});
    }
  } else {
    callback(400,{'Error' : 'Missing required field.'});
  }
};

// Required data: email, token
// also Cleanup old orders associated with the user
handlers._users.delete = function(data,callback){ // callback(200);
  // Check that email number is valid
  var email = typeof(data.queryStringObject.email) == 'string' ? data.queryStringObject.email.trim() : false;
  if(email){

    // Get token from headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token,email,function(tokenIsValid){
      if(tokenIsValid){
        // Lookup the user
        _data.read('users',email,function(err,userData){
          if(!err && userData){
            // Delete the user's data
            _data.delete('users',email,function(err){
              if(!err){
                // Delete each of the orders associated with the user
                var userOrders = typeof(userData.orders) == 'object' && userData.orders instanceof Array ? userData.orders : [];
                var ordersToDelete = userOrders.length;
                if(ordersToDelete > 0){
                  var ordersDeleted = 0;
                  var deletionErrors = false;
                  // Loop through the orders
                  userOrders.forEach(function(orderId){
                    // Delete the order
                    _data.delete('orders',orderId,function(err){
                      if(err){
                        deletionErrors = true;
                      }
                      ordersDeleted++;
                      if(ordersDeleted == ordersToDelete){
                        if(!deletionErrors){
                          callback(200);
                        } else {
                          callback(500,{'Error' : "Errors encountered while attempting to delete all of the user's orders. All orders may not have been deleted from the system successfully."})
                        }
                      }
                    });
                  });
                } else {
                  callback(200);
                }
              } else {
                callback(500,{'Error' : 'Could not delete the specified user'});
              }
            });
          } else {
            callback(400,{'Error' : 'Could not find the specified user.'});
          }
        });
      } else {
        callback(403,{"Error" : "Missing required token in header, or token is invalid."});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'})
  }
};

// Tokens
handlers.tokens = function(data,callback){ // from data.method desides which of handlers._tokens(data, callback) to run
  var acceptableMethods = ['post','get','put','delete'];
  if(acceptableMethods.indexOf(data.method) > -1){
    handlers._tokens[data.method](data,callback);
  } else {
    callback(405);
  }
};

// Container for all the tokens methods
handlers._tokens  = {};

// Tokens - post
// Required data: email, password
// Optional data: none
handlers._tokens.post = function(data,callback){ // callback(200,tokenObject);
  var email = typeof(data.payload.email) == 'string' ? data.payload.email.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  if(email && password){
    // Lookup the user who matches that email
    _data.read('users',email,function(err,userData){
      if(!err && userData){
        // Hash the sent password, and compare it to the password stored in the user object
        var hashedPassword = helpers.hash(password);
        if(hashedPassword == userData.hashedPassword){
          // If valid, create a new token with a random name. Set an expiration date 1 hour in the future.
          var tokenId = helpers.createRandomString(20);
          var expires = Date.now() + 1000 * 60 * 60;
          var tokenObject = {
            'email' : email,
            'id' : tokenId,
            'expires' : expires
          };

          // Store the token
          _data.create('tokens',tokenId,tokenObject,function(err){
            if(!err){
              callback(200,tokenObject);
            } else {
              callback(500,{'Error' : 'Could not create the new token'});
            }
          });
        } else {
          callback(400,{'Error' : 'Password did not match the specified user\'s stored password'});
        }
      } else {
        callback(400,{'Error' : 'Could not find the specified user.'});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field(s).'})
  }
};

// Tokens - get
// Required data: id of tokenObject
// Optional data: none
handlers._tokens.get = function(data,callback){ // callback(200,tokenObject);
  // Check that id is valid
  var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id){
    // Lookup the token
    _data.read('tokens',id,function(err,tokenObject){
      if(!err && tokenObject){
        callback(200,tokenObject);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field, or field invalid'})
  }
};

// Tokens - put, to exted the token validity
// Required data: id, extend
// Optional data: none
handlers._tokens.put = function(data,callback){ // callback(200)
  var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
  var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
  if(id && extend){
    // Lookup the existing token
    _data.read('tokens',id,function(err,tokenData){
      if(!err && tokenData){
        // Check to make sure the token isn't already expired
        if(tokenData.expires > Date.now()){
          // Set the expiration an hour from now
          tokenData.expires = Date.now() + 1000 * 60 * 60;
          // Store the new updates
          _data.update('tokens',id,tokenData,function(err){
            if(!err){
              callback(200);
            } else {
              callback(500,{'Error' : 'Could not update the token\'s expiration.'});
            }
          });
        } else {
          callback(400,{"Error" : "The token has already expired, and cannot be extended."});
        }
      } else {
        callback(400,{'Error' : 'Specified user does not exist.'});
      }
    });
  } else {
    callback(400,{"Error": "Missing required field(s) or field(s) are invalid."});
  }
};

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = function(data,callback){ // callback(200)
  // Check that id is valid
  var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id){
    // Lookup the token
    _data.read('tokens',id,function(err,tokenData){
      if(!err && tokenData){
        // Delete the token
        _data.delete('tokens',id,function(err){
          if(!err){
            callback(200);
          } else {
            callback(500,{'Error' : 'Could not delete the specified token'});
          }
        });
      } else {
        callback(400,{'Error' : 'Could not find the specified token.'});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'})
  }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function(id,email,callback){ // callback(true)
  // Lookup the token
  _data.read('tokens',id,function(err,tokenData){
    if(!err && tokenData){
      // Check that the token is for the given user and has not expired
      if(tokenData.email == email && tokenData.expires > Date.now()){
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

// Menu
handlers.menu = function(data,callback){
  var acceptableMethods = ['get'];
  if(acceptableMethods.indexOf(data.method) > -1){
    handlers._menu[data.method](data,callback);
  } else {
    callback(405);
  }
};

// Container for all the orders methods
handlers._menu = {};

// Menu - get
// Required data: user email, user token
// Optional data: none
handlers._menu.get = function(data,callback){ // callback(200,menuData)
  // Check that user token and email are provided
  var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
  var email = typeof(data.headers.email) == 'string' ? data.headers.email.trim() : false;
  if(token&&email){
    // check that the token is issued to the user requesting the menu
    handlers._tokens.verifyToken(token,email,function(tokenIsValid){
      if(tokenIsValid){
        // Lookup and provide the menu to requester
        _data.read('menu','menu',function(err,menuData){
          if(!err&&menuData){
            callback(200,menuData);
          } else {
            callback(404,{'Error' : 'Menu not found'});
          }
        });
      } else {
        callback(403,{'Error' : 'Email/ token missmatch'});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing or invalid required data - email and token'});
  }
};

// Orders
handlers.orders = function(data,callback){
  var acceptableMethods = ['post','get','put','delete'];
  if(acceptableMethods.indexOf(data.method) > -1){
    handlers._orders[data.method](data,callback);
  } else {
    callback(405);
  }
};

// Container for all the orders methods
handlers._orders = {};

// Orders - post
// Required data: email, token, quantity per each model
// Optional data: none
handlers._orders.post = function(data,callback){ // callback(200,orderId)
   // Check that user token and email are provided
   var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
   var email = typeof(data.payload.email) == 'string' ? data.payload.email.trim() : false;
   // Check that order array is provided
   var order = typeof(data.payload.order) == 'object' && data.payload.order instanceof Array ? data.payload.order : false;

   // verify required details
   if(token && email && helpers.verifyOrder(order)){
     // check that the token is issued to the user requesting the menu
     handlers._tokens.verifyToken(token,email,function(tokenIsValid){
       if(tokenIsValid){
         // get id for the order
         var orderId = helpers.createRandomString(20);
         // build the order object
         var orderObject = {};
         orderObject.id = orderId;
         orderObject.order = order;
         orderObject.date = Date.now();
         orderObject.status = 'accepted';
         // post the order
         _data.create('orders',orderId,orderObject,function(err){
          if(!err){ // orderObject posted
            // amend the user data
            _data.read('users',email,function(err,userData){
              if(!err&&userData){
                if(!userData.orders){ 
                  userData.orders = [];
                }
                userData.orders.push(orderId);
                // update the user data
                _data.update('users',email,userData,function(err){
                  if(!err){
                    callback(200,{'orderId':orderId});
                  } else {
                    callback(500,{'Error' : 'Failed to update user data'});
                  }
                });
              } else {
                callback(404,{'Error' : 'Failed to fetch user data'});
              }
            });
          } else {
            callback(500,{'Error' : 'Failed to create new order'});
          }
         });
       } else {
         callback(403,{'Error' : 'Email/ token missmatch'});
       }
     });
   } else {
     callback(400,{'Error' : 'Missing or invalid required data - email and token'});
   }
};

// Orders - get 
// Required data: user email and token
// Optional data: orderId ( all orders are fetched if not provided )
handlers._orders.get = function(data,callback){ // callback(200,orderDatas)
   // Check that user token and email are provided
   var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
   var email = typeof(data.headers.email) == 'string' ? data.headers.email.trim() : false;
   var order = typeof(data.headers.order) == 'string' ? data.headers.order.trim() : false;
   // verify required details
   if(token && email){
     // check that the token is issued to the user requesting his orders
     handlers._tokens.verifyToken(token,email,function(tokenIsValid){
       if(tokenIsValid){
         // get the orders files list
         _data.read('users',email,function(err,userData){
          if(!err&&userData){
            // init the user orders container
            var userOrders = [];
            var counter = 0;
            var errorIter = false;
            // iterate over orders to fill the container with data
            if (!userData.orders){ // user has not posted any orders
              callback(200,[]);
            } else { // user has posted some orders
              if(order){
                if(!userData.orders){
                  callback(404,{'Error' : 'User has not posted any orders yet'});
                } else {
                  if(userData.orders.indexOf(order)>-1){
                    _data.read('orders',order,function(err,orderData){
                      if(!err&&orderData){
                        callback(200,orderData);
                      } else {
                        callback(404,{'Error' : 'Failed to fetch the order'});
                      }
                    });
                  } else {
                    callback(404,{'Error' : 'User has not posted that order'});
                  }
                }
              } else { // orderId missing in the headers or badly formatted
                Array.prototype.forEach.call(userData.orders,(el)=>{
                  // get each order details
                  _data.read('orders',el,function(err,orderData){
                    if(!err&&orderData){
                      var currentOrder = {};
                      currentOrder.id = orderData.id;
                      currentOrder.order = orderData.order;
                      currentOrder.status = orderData.status;
                      userOrders.push(currentOrder);
                    } else {
                      errorIter = true;
                    }
                    counter++;
    
                    // build response on successful read
                    if(counter === userData.orders.length){
                      if(!errorIter){
                        callback(200,userOrders);
                      } else {
                        callback(500,{'Error' : 'Failed to collect users orders'});
                      }
                    }
                  });
                });
              }
            }
          } else {
            callback(404,{'Error' : 'Failed to fetch user data'});
          }
         });
       } else {
         callback(403,{'Error' : 'Email/ token missmatch'});
       }
     });
   } else {
     callback(400,{'Error' : 'Missing or invalid required data - email and token'});
   }
};

// Orders - put, if requested within 5min from ordering and only once
// Required data: user email and token, order id, amended quantity per each model
// Optional data: none
handlers._orders.put = function(data,callback){ // callback(200)
   // Check that user token and email are provided
   var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
   var orderId = typeof(data.headers.order) == 'string' ? data.headers.order.trim() : false;
   var email = typeof(data.payload.email) == 'string' ? data.payload.email.trim() : false;
   var order = typeof(data.payload.order) == 'object' && data.payload.order instanceof Array && data.payload.order.length>0 ? data.payload.order : false;
   
   if(token&&email&&orderId&&order){
     // check that the token is issued to the user requesting the amend
     handlers._tokens.verifyToken(token,email,function(tokenIsValid){
       if(tokenIsValid){
         // check that the order is posted by the user requesting the amend
         _data.read('users',email,function(err,userData){
           if(!err&&userData&&userData.orders&&(userData.orders.indexOf(orderId)>-1)){
             if(helpers.verifyOrder(order)){
               // check for time allowance and status of the order
               _data.read('orders',orderId,function(err,orderData){
                 if(!err&&orderData){
                  if(orderData.status==='accepted' && (Date.now()-orderData.date<5*60*1000)){
                    // build the updated order object
                    var updatedOrder = {};
                    updatedOrder.id = orderId;
                    updatedOrder.order = order;
                    updatedOrder.date = Date.now();
                    updatedOrder.status = 'updated';
                    _data.update('orders',orderId,updatedOrder,function(err){
                      if(!err){
                        callback(200);
                      } else {
                        callback(500,{'Error' : 'Failed updating order'});
                      }
                    });
                  } else {
                    callback(403,{'Error' : 'Order is not amendable'});
                  }
                 } else {
                   callback(404,{'Error' : 'Failed to fetch order data'})
                 }
               });
             } else {
              callback(403,{'Error' : 'Order update not as required'});
             }
           } else {
            callback(404,{'Error' : 'User/ order missmatch'});
           }
         });
       } else {
         callback(403,{'Error' : 'Email/ token missmatch'});
       }
     });
   } else {
     callback(400,{'Error' : 'Missing or invalid required data - email,token,order id and order amended'});
   }
};

// Orders - delete, if status is either 'accepted' or 'updated'
// Required data: user email and token, order id
// Optional data: none
handlers._orders.delete = function(data,callback){ // callback(200)
  // Check that user token and email are provided
  var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
  var email = typeof(data.headers.email) == 'string' ? data.headers.email.trim() : false;
  var orderId = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    
  if(token&&email&&orderId){
    // check that the token is issued to the user requesting the amend
    handlers._tokens.verifyToken(token,email,function(tokenIsValid){
      if(tokenIsValid){
        // check that the order is posted by the user requesting the deletion
        _data.read('users',email,function(err,userData){
          if(!err&&userData&&userData.orders&&(userData.orders instanceof Array)&&(userData.orders.indexOf(orderId)>-1)){
            // check the status of the order
            _data.read('orders',orderId,function(err,orderData){
              if(!err&&orderData){
               if(orderData.status==='accepted' || orderData.status==='updated'){
                 // delete the order
                 _data.delete('orders',orderId,function(err){
                   if(!err){
                    userData.orders.splice(userData.orders.indexOf(orderId),1);
                    // Re-save the user's data
                    _data.update('users',email,userData,function(err){
                      if(!err){
                        callback(200);
                      } else {
                        callback(500,{'Error' : 'Could not update the user.'});
                      }
                    });
                   } else {
                     callback(500,{'Error' : 'Failed to delete order'});
                   }
                 });
               } else {
                 callback(403,{'Error' : 'Order is not amendable'});
               }
              } else {
                callback(404,{'Error' : 'Failed to fetch order data'})
              }
            });
          } else {
           callback(404,{'Error' : 'User/ order missmatch'});
          }
        });
      } else {
        callback(403,{'Error' : 'Email/ token missmatch'});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing or invalid required data - email,token,order id and order amended'});
  }
};

handlers.payments = function(data,callback){
  var acceptableMethods = ['post'];
  if(acceptableMethods.indexOf(data.method) > -1){
    handlers._payments[data.method](data,callback);
  } else {
    callback(405);
  }
};

// Container for all the payments methods
handlers._payments = {};

// Order payment - post, if status is either 'accepted' or 'updated'
// Required data: user email and token, order id
// Optional data: none
handlers._payments.post = function(data,callback){ // callback(200,paymentId)
  // Check that user token and email are provided
  var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
  var email = typeof(data.headers.email) == 'string' ? data.headers.email.trim() : false;
  var orderId = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  var source = typeof(data.queryStringObject.source) == 'string' ? data.queryStringObject.source.trim() : false;
  var currency = typeof(data.queryStringObject.currency) == 'string' ? data.queryStringObject.currency.trim() : false;
  var description = typeof(data.queryStringObject.description) == 'string' ? data.queryStringObject.description.trim() : false;

  if(token&&email&&orderId&&source&&currency&&description){
    // check that the token is issued to the user requesting the amend
    handlers._tokens.verifyToken(token,email,function(tokenIsValid){
      if(tokenIsValid){
        // check that the order is posted by the user requesting the payment
        _data.read('users',email,function(err,userData){
          if(!err&&userData&&userData.orders&&(userData.orders instanceof Array)&&(userData.orders.indexOf(orderId)>-1)){
            // check the status of the order
            _data.read('orders',orderId,function(err,orderData){
              if(!err&&orderData){
               if(orderData.status==='accepted' || orderData.status==='updated'){
                 // process the the order payment
                 var amount = helpers.calculatePaymentAmount(orderData.order); 
                 helpers.createStripePayment(source,amount, function(err,paymentData){
                   if(!err&&paymentData){
                     // amend the order status
                      // build the updated order
                     var updaterOrder = JSON.parse(JSON.stringify(orderData));
                     updaterOrder.status = 'payed';
                     // update the order in the storage
                     _data.update('orders',orderId,updaterOrder,function(err){
                       if(!err){
                        // callback(200,{'payment Id':paymentData.paymentId,'payment amount in USD':amount/100})
                        // notify the client by email for the payment
                        var notification = `By invoice ${paymentData.paymentId} you have payed successfully ${amount/100} USD for your pizzas order ${orderId}`;
                        helpers.createMailgunNotification(email,notification,function(err,mailData){
                          if(!err&&mailData){
                            callback(200,mailData);
                          } else {
                            callback(500,{'Error':err});
                          }
                        });
                       } else {
                         callback(500,{'Error':'Payment completed, order status updated failed'});
                       }
                     });
                   } else {
                    callback(500,{'Error' : err});
                   }
                 });
                } else {
                  callback(403,{'Error' : 'Order is not payable'});
                }
              } else {
                callback(404,{'Error' : 'Failed to fetch order data'});
              }
            });
          } else {
           callback(404,{'Error' : 'User/ order missmatch'});
          }
        });
      } else {
        callback(403,{'Error' : 'Email/ token missmatch'});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing or invalid required data - email,token,order id and order amended'});
  }
};

// Export the handlers
module.exports = handlers;
