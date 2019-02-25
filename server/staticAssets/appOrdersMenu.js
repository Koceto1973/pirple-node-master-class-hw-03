var app = {};

// Call the init processes after the window loads
window.onload = function(){
  app.bindForm();

  app.loadDataOnPage();
};

// AJAX Client (for RESTful API)
app.client = {}

// Interface for making API calls
app.client.request = function(headers,path,method,queryStringObject,payload,callback){

  // Set defaults
  headers = typeof(headers) == 'object' && headers !== null ? headers : {};
  path = typeof(path) == 'string' ? path : '/';
  method = typeof(method) == 'string' && ['POST','GET','PUT','DELETE'].indexOf(method.toUpperCase()) > -1 ? method.toUpperCase() : 'GET';
  queryStringObject = typeof(queryStringObject) == 'object' && queryStringObject !== null ? queryStringObject : {};
  payload = typeof(payload) == 'object' && payload !== null ? payload : {};
  callback = typeof(callback) == 'function' ? callback : false;

  // For each query string parameter sent, add it to the path
  var requestUrl = path+'?';
  var counter = 0;
  for(var queryKey in queryStringObject){
     if(queryStringObject.hasOwnProperty(queryKey)){
       counter++;
       // If at least one query string parameter has already been added, preprend new ones with an ampersand
       if(counter > 1){
         requestUrl+='&';
       }
       // Add the key and value
       requestUrl+=queryKey+'='+queryStringObject[queryKey];
     }
  }

  // Form the http request as a JSON type
  var xhr = new XMLHttpRequest();
  xhr.open(method, requestUrl, true); console.log('xhr request url', requestUrl);
  xhr.setRequestHeader("Content-type", "application/json"); // front end asking it's back end

  // For each header sent, add it to the request
  for(var headerKey in headers){
     if(headers.hasOwnProperty(headerKey)){
       xhr.setRequestHeader(headerKey, headers[headerKey]);
     }
  }

  // When the request comes back, handle the response
  xhr.onreadystatechange = function() {
      if(xhr.readyState == XMLHttpRequest.DONE) {
        var statusCode = xhr.status;
        var responseReturned = xhr.responseText;

        // Callback if requested
        if(callback){
          try{
            var parsedResponse = JSON.parse(responseReturned);
            callback(statusCode,parsedResponse);
          } catch(e){
            callback(statusCode,{});
          }
        }
      }
  }

  // Send the payload as JSON
  var payloadString = JSON.stringify(payload);
  xhr.send(payloadString);

};

app.bindForm = function(){
  if(document.querySelector("form")){ // if there are forms on the page
    var allForms = document.querySelectorAll("form"); // get them
    for(var i = 0; i < allForms.length; i++){ // and for each form
        allForms[i].addEventListener("submit", function(e){ // on submition
        // Stop it from submitting
        e.preventDefault();
        var formId = this.id;
        var path = this.action;
        var method = this.method.toUpperCase();

        // Hide the error message (if it's currently shown due to a previous error)
        document.querySelector("#"+formId+" .formError").style.display = 'none';

        // Hide the success message (if it's currently shown due to a previous error)
        if(document.querySelector("#"+formId+" .formSuccess")){
          document.querySelector("#"+formId+" .formSuccess").style.display = 'none';
        }

        // Turn the inputs into a payload
        var payload = {};
        var elements = this.elements;
        for(var i = 0; i < elements.length; i++){
          if(elements[i].type !== 'submit'){ // do not count the submit button
            // Determine class of element
            var classOfElement = typeof(elements[i].classList.value) == 'string' && elements[i].classList.value.length > 0 ? elements[i].classList.value : '';
            // Set proper value
            var valueOfElement = elements[i].type == 'checkbox' && classOfElement.indexOf('multiselect') == -1 ? elements[i].checked : classOfElement.indexOf('intval') == -1 ? elements[i].value : parseInt(elements[i].value);
            var elementIsChecked = elements[i].checked;
            
            // Override the method of the form if the input's name is _method
            var nameOfElement = elements[i].name;
            if(nameOfElement == '_method'){
              method = valueOfElement;
            } else {
              // Create an payload field named "method" if the elements name is actually httpmethod
              if(nameOfElement == 'httpmethod'){
                nameOfElement = 'method';
              }

              // Create an payload field named "id" if the elements name is actually uid
              if(nameOfElement == 'uid'){
                nameOfElement = 'id';
              }
              // If the element has the class "multiselect" add its value(s) as array elements
              if(classOfElement.indexOf('multiselect') > -1){
                if(elementIsChecked){
                  payload[nameOfElement] = typeof(payload[nameOfElement]) == 'object' && payload[nameOfElement] instanceof Array ? payload[nameOfElement] : [];
                  payload[nameOfElement].push(valueOfElement);
                }
              } else {
                payload[nameOfElement] = valueOfElement; // add the current element to the payload
              }

            }
          }
        }

        // If the method is DELETE, the payload should be a queryStringObject instead
        var queryStringObject = method == 'DELETE' ? payload : {};

        var headers;

        if(sessionStorage.getItem('token')) {
          headers = { 'token':JSON.parse(sessionStorage.getItem('token')).id};
        }

        // Call the API, on success app.formResponseProcessor(formId,payload,responsePayload);
        app.client.request(headers,path,method,queryStringObject,payload,function(statusCode,responsePayload){
          // Display an error on the form if needed
          if(statusCode !== 200){

            if(statusCode == 403){ // forbidden
              // log the user out
              app.logUserOut();

            } else {

              // Try to get the error from the api, or set a default error message
              var error = typeof(responsePayload.Error) == 'string' ? responsePayload.Error : 'An error has occured, please try again';

              // Set the formError field with the error text
              document.querySelector("#"+formId+" .formError").innerHTML = error;

              // Show (unhide) the form error field on the form
              document.querySelector("#"+formId+" .formError").style.display = 'block';
            }
          } else {
            // If successful, send to form response processor
            app.formResponseProcessor(formId,payload,responsePayload);
          }
        });
      });
    }
  }
};

// Form response processor
app.formResponseProcessor = function(formId,requestPayload,responsePayload){
  var functionToCall = false;
  // If account creation was successful, try to immediately log the user in
  if(formId == 'accountCreate'){
    // Take the email and password, and use it to log the user in
    var newPayload = {
      'email' : requestPayload.email,
      'password' : requestPayload.password
    };

    app.client.request(undefined,'/api/tokens','POST',undefined,newPayload,function(newStatusCode,newResponsePayload){
      // Display an error on the form if needed
      if(newStatusCode !== 200){

        // Set the formError field with the error text
        document.querySelector("#"+formId+" .formError").innerHTML = 'Sorry, an error has occured. Please try again.';
        // Show (unhide) the form error field on the form
        document.querySelector("#"+formId+" .formError").style.display = 'block';

      } else {
        // If successful, set the token and redirect the user
        sessionStorage.setItem('token',JSON.stringify(newResponsePayload));
        window.location = '/orders';
      }
    });
  }

  if(formId == 'sessionCreate'){
    // save the new token and redirect
    sessionStorage.setItem('token',JSON.stringify(responsePayload));
    window.location = '/orders';
  }

  if(formId == 'accountEdit'){
    // Take the email and password, and use it to log the user in
    var newPayload = {
      'email' : requestPayload.email,
      'password' : requestPayload.password
    };

    app.client.request(undefined,'/api/tokens','POST',undefined,newPayload,function(newStatusCode,newResponsePayload){
      // Display an error on the form if needed
      if(newStatusCode !== 200){

        // Set the formError field with the error text
        document.querySelector("#"+formId+" .formError").innerHTML = 'Sorry, an error has occured. Please try again.';
        // Show (unhide) the form error field on the form
        document.querySelector("#"+formId+" .formError").style.display = 'block';

      } else {
        // If successful, set the token and redirect the user
        sessionStorage.setItem('token',JSON.stringify(newResponsePayload));
        window.location = '/orders';
      }
    });
  }

  if(formId == 'accountDelete'){
    // If successful, redirect the user
    window.location = '/account/deleted';
  }

  
};

// Load respectful data on the page ( menu, orders )
app.loadDataOnPage = function(){
  // Get the current page from the body class
  var bodyClasses = document.querySelector("body").classList;
  var primaryClass = typeof(bodyClasses[0]) == 'string' ? bodyClasses[0] : false;

  // Logic for account settings page
  if(primaryClass == 'orders'){
    app.loadOrders();
  }

  // Logic for dashboard page
  if(primaryClass == 'ordersMenu'){
    app.loadOrdersMenu();
  }
};

app.logUserOut = function(){
  console.log('Logging the user out ...');
}

app.loadOrders = function(){
  console.log('loading Orders page ...');
}

app.loadOrdersMenu = function(){
  // clear old errors
  document.querySelector(".contentError").innerHTML = '';

  // stack headers for the api/menu call
  var headers = {
    "token": JSON.parse(sessionStorage.getItem('token')).id,
    "email":JSON.parse(sessionStorage.getItem('token')).email
  }

  // ask api for the menu
  app.client.request(headers,'/api/menu','GET',undefined,undefined,function(newStatusCode,newResponsePayload){
    if(newStatusCode !== 200){
      // Set the contentError field with the error text
      document.querySelector(".contentError").innerHTML = 'Sorry, an error has occured. Please try again.';
      console.log(JSON.stringify(newResponsePayload)); // api error response
    } else { // If successful
      // clear old menu if any
      document.getElementById('myMenu').innerHTML = '';
      // load the menu items
      var index = 0;
      for(var pizza in newResponsePayload){
        if(newResponsePayload.hasOwnProperty(pizza)){
          // console.log(pizza, newResponsePayload[pizza]);
          var mold = `
                      <div class="pizza">
                        <img src="/staticAssets/pizzas/${pizza}.jpg" alt=""></img>
                        <div class="pizzaSelect">
                          <div class="pizzaName">${pizza} / ${newResponsePayload[pizza].toFixed(2)} $</div>
                          <button class="pizzaOrderLess ${index} ${pizza} ">order less</button>
                          <div class="pizzaOrdered">Ordered : <span class="pizzaOrdered${index}">0</span></div>
                          <button class="pizzaOrderMore ${index} ${pizza} ">order more</button>
                        </div>
                        <div class="spacerBig"></div>
                      </div>
                     `;
          document.getElementById('myMenu').insertAdjacentHTML('beforeend',mold);
          index++ ;
        }
      };

      // set up the listener for order updates
      document.getElementById('myMenu').addEventListener('click',function(event){
        // read the order amend request
        var amend = event.target.classList[0] === 'pizzaOrderLess' ? 'less' : 'more';
        var pizzaIndex = event.target.classList[1];
        var pizzaName = event.target.classList[2];
        if ( (typeof event.target.classList[3]) !== 'undefined' ){
          pizzaName += ' ' + event.target.classList[3];
        }
        
        // respond to the order amend request
        if (amend === 'less'){
          if(parseInt(document.querySelector('.pizzaOrdered'+pizzaIndex).textContent)>0){
            document.querySelector('.pizzaOrdered'+pizzaIndex).textContent = parseInt(document.querySelector('.pizzaOrdered'+pizzaIndex).textContent) - 1 ;
          }
        } else { // amend === 'more'
          if ([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].reduce((acc,curr)=>
            acc + parseInt(document.querySelector('.pizzaOrdered'+curr).textContent),0)<20){ // less than 20 ttl ordered
            if(parseInt(document.querySelector('.pizzaOrdered'+pizzaIndex).textContent)<5){
              document.querySelector('.pizzaOrdered'+pizzaIndex).textContent = parseInt(document.querySelector('.pizzaOrdered'+pizzaIndex).textContent) + 1 ;
            }
          }
        }
      });

      // set up event listener for the order placement
      document.querySelector('.placeOrder').addEventListener('click',function(){
        // place the new order
        headers = {
          "token": JSON.parse(sessionStorage.getItem('token')).id,
          "Content-Type":"application/JSON"
        };

        payload = {
          "email": JSON.parse(sessionStorage.getItem('token')).email,
          "order": [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map((el)=>
                          parseInt(document.querySelector('.pizzaOrdered'+el).textContent))
        }

        app.client.request(headers,'/api/orders','POST',undefined,payload,function(newStatusCode,newResponsePayload){
          if(newStatusCode!==200){
            // Set the contentError field with the error text
            document.querySelector(".contentError").innerHTML = 'Sorry, an error has occured. Please try again.';
            console.log(JSON.stringify(newResponsePayload)); // api error response
          } else {
            // redirect to orders page
            window.location = '/orders';
          }
        });
      });
    }
  });
}