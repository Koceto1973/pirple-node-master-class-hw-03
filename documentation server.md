Hi guys, here is a brief talk how to call the API,
further hints you may gather from:
  - postman requests / environment collections attached for your convinience
  - comments into code, handlers.js and helpers.js
  - and the code itself, handlers.js and helpers.js

I. Users management: CRUD functionality is covered, use /users route

  1. Create new user:
    // POST request to /users
    // Required payload data: 
        // name( valid non-zero string), 
        // email( valid string, min 5 chars), 
        // address( valid string, min 10 chars), 
        // password ( valid non-zero string)
    // Required headers: 
      // Content-Type: application/json
    // on success 
        // response status code should be 200

  2. Get user data: you should have had issued a user token first, see below for token create
    // GET request to /users
    // Required querystring data: email( valid string, min 5 chars)
    // Required headers data: 
        // valid user token ( api generated )
        // Content-Type: application/json
    // on success 
      // response status code should be 200, 
      // and user details in json ( without password )

  3. Amend user data: you should have had issued a user token first, see below for token create
    // PUT request to /users
    // Required querystring data: email( valid string, min 5 chars)
    // Required headers data: 
        // valid user token ( api generated )
        // Content-Type: application/json
    // Optional payload data: 
        // name( valid non-zero string), 
        // address( valid string, min 10 chars), 
        // password ( valid non-zero string)       
      , at least one must be specified to get the request in use
    // on success 
        // response status code should be 200

  4. Delete user data: you should have had issued a user token first, see below for token create
    // DELETE request to /users
    // Required querystring data: email( valid string, min 5 chars)
    // Required headers data: 
        // valid user token ( api generated )
        // Content-Type: application/json
    // on success 
        // response status code should be 200,
        // user's orders are wiped out

II. Tokens management: CRUD functionality is covered, use /tokens route

  1. Create new token:
    // POST request to /tokens
    // Required payload data: 
        // email( valid string, already registered as email in I.1), 
        // password ( valid string, already registered as password in I.1)
    // Required headers: 
        // Content-Type: application/json
    // on success 
        // response status code should be 200, 
        // token details in JSON, token is valid for 1 hour

  2. Get user token data: 
    // GET request to /tokens
    // Required querystring data: 
        // id of the token
    // on success 
        // response status code should be 200, 
        // token details in JSON

  3. Extend token validity: 
    // PUT request to /tokens
    // Required payload data: 
        // id of the token 
        // extend property set to true
    // Required headers: 
        // Content-Type: application/json
    // on success 
        // response status code should be 200, 
        // token validity extended for 1 hour more

  4. Delete token: 
    // DELETE request to /tokens
    // Required querystring data: 
        // id of the token
    // Optional data: none
    // on success 
        // response status code should be 200

III. Orders management: CRUD functionality is covered, use /orders and /menu routes

  0. Get the menu:
    // GET request to /menu
    // Required headers data: 
        // email( valid string, already registered as email in I.1), 
        // token ( valid string, issued in II.1)
    // on success 
        // response status code should be 200, 
        // menu details in JSON with 17 properties, formatted <pizza model>:<price in usd>

  1. Create new order:
    // POST request to /orders
    // Required payload data: 
        // email( valid string, already registered as email in I.1), 
        // order ( valid array of 17( number of pizzas in menu ) integers, representing ordered qtty of each pizza model)
           for example: "order":[ 0,1,3,0,0,0,3,0,0,0,0,2,0,0,0,0,0 ]
           order limitations: order min 1, max 20, max 5 per pizza model
    // Required headers: 
        // Content-Type: application/json
    // Required headers: 
        // id of a valid user token
    // on success 
        // response status code should be 200, 
        // order id details in JSON, status is 'accepted'
    
  2. Get order(s) data: 
    // GET request to /orders
    // Required headers data: 
        // token, 
        // email
    // Optional headers data: 
        // order id, to get details of only particular order of many orders
    // on success 
        // response status code should be 200, 
        // order(s) details in JSON

  3. Amend order details: allowed only once, up to 5 min after order is accepted first 
    // PUT request to /orders
    // Required payload data: 
        // email( valid string, already registered as email in I.1), 
        // order ( valid array of 17( number of pizzas in menu ) integers, representing ordered qtty of each pizza model)
           for example: "order":[ 0,1,3,0,0,0,3,0,0,0,0,2,0,0,0,0,0 ]
           order limitations: order min 1, max 20, max 5 per pizza model
    // Required headers: 
        // Content-Type: application/json
    // Required headers: 
        // id of a valid user token, 
        // id of a valid order with status 'accepted'
    // on success 
        // response status code should be 200, 
        // order status amended to 'updated'

  4. Delete an order: 
    // DELETE request to /orders
    // Required querystring data: 
        // id of the order to be deleted, with status 'accepted' or 'updated'
    // Required headers: 
        // id of a valid user token, 
        // user email
    // on success 
        // response status code should be 200

IV. Payments management:

  1. Pay for an order:
    // POST request to /orders.payments
    // Required querystring data:
        // id of the order to be payed
        // source - user payment card token issued by Stripe.com
        // currency set to usd
        // description 
    // Required headers: 
        // id of a valid user token, 
        // user email
    // on success 
        // response status code should be 200, 
        // email owner should be emailed with payment and charging details
  