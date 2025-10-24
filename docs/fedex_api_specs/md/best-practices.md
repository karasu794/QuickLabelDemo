# best-practices

> Source: https://developer.fedex.com/api/en-us/guides/best-practices.html

                   window.FDX = window.FDX || {}; window.FDX.GDL = window.FDX.GDL || \[\]; var FDX = {}; FDX.contextPath = ""; window.fdx=window.fdx || {}; fdx.context={ envtVar:"", searchUrl:"/services/search", isPublishMode:"true" }; if (!FDX) { var FDX = {}; } FDX.DATALAYER ={}; FDX.GDL = \[\]; FDX.DATALAYER.event=\[\]; FDX.DATALAYER.page = { pageInfo: { pageName: "best\\u002Dpractices", locale: "en\_us", language:"en", historicalPageName : "", referrer : "", toolUsage:"", viewPort:"", reportSuite:"", region: "us", country:"us", pagePath:"apps\\/fdp\\/guides\\/best\\u002Dpractices", securePage : "" }, category: { pageType:"", primaryCategory: "", isApplication:"", appName:"" }, onsiteSearch:{ term:"", suggested: "" }, link:{ data:"", type:"" }, button:{ data:"", type:"" }, assetSearch:{ keyword:"", type:"" } }; let country = "us"; let language = "en"; let pagepath = "apps\\/fdp\\/guides\\/best\\u002Dpractices"; let hash = window.location.hash; let pageId = country.toUpperCase().concat("/", language).concat("/", pagepath).concat("", hash).replace("#", ""); window.FDX.GDL.push(\[ 'event:publish', \[ 'page', 'pageinfo', { pageId: pageId } \] \]); FDX.DATALAYER.googleAPIFlag=false; FDX.DATALAYER.inputField=''; FDX.DATALAYER.userType=""; FDX.DATALAYER.locationApp = { googleAPIFlag: "", };    (function(g,b,d,f){(function(a,c,d){if(a){var e=b.createElement("style");e.id=c;e.innerHTML=d;a.appendChild(e)}})(b.getElementsByTagName("head")\[0\],"at-body-style",d);setTimeout(function(){var a=b.getElementsByTagName("head")\[0\];if(a){var c=b.getElementById("at-body-style");c&&a.removeChild(c)}},f)})(window,document,"body {opacity: 0 !important}",3E3);  window\['adrum-start-time'\] = new Date().getTime(); (function(config){ config.appKey = $("#templateConfig").val(); config.adrumExtUrlHttp = 'http://cdn.appdynamics.com'; config.adrumExtUrlHttps = 'https://cdn.appdynamics.com'; config.beaconUrlHttp = 'http://pdx-col.eum-appdynamics.com'; config.beaconUrlHttps = 'https://pdx-col.eum-appdynamics.com'; config.xd = {enable : false}; })(window\['adrum-config'\] || (window\['adrum-config'\] = {}));          

true

![](/api/content/dam/fedex-com/irc/leftnav/white.png)  

 [![ Sign Up or Log In](/api/content/dam/fedex-com/irc/leftnav/login-icon_white.svg) Sign Up or Log In](#)

* * *

 ![](/api/content/dam/fedex-com/irc/leftnav/login-icon_purple.svg) Sign Up or Log In

MAIN MENU

LOG IN

FORGOT PASSWORD OR USER ID?

* * *

Get access to FedEx APIs by creating a user ID.

SIGN UP

  

Menu Developer Portal

-   [Guides](https://developer.fedex.com/api/en-us/guides.html) 

         

-   [Guides](https://developer.fedex.com/api/en-us/guides.html) 
-   

![search](/api/content/dam/fedex-com/irc/leftnav/Search_Icon2x.png)

 ![](/api/content/dam/fedex-com/irc/common/close-first.png)

![](/api/content/dam/fedex-com/irc/common/search.png)

CANCEL

FedEx APIs Integration Best Practices

This is a quick reference guide intended to help API consumers understand ways to improve integration experience with FedEx and ensure the quality of integration solution in terms of design, speed and security.

To efficiently integrate with FedEx APIs, developers should follow these integration best practices:

API URIs

-   There are separate API URIs for test and production. 
-   Developers should use the test URIs for development and integration testing and the production URI for production.

Listed are the API URIs:

Test: https://apis-sandbox.fedex.com/

Production: https://apis.fedex.com/

Credential management

-   API Key and Secret Key
    

-   Your API Key and Secret Key are used to identify your application and need to be used in OAuth token request.

1.  Your API Key and Secret Key should be treated very securely. Do not distribute API Key or Secret Key via email or distributed code including client-side JavaScript.
2.  Your application will be compromised if your API Key or Secret Key are stolen. If you suspect that your credentials are stolen or compromised, please recreate the Secret Key immediately.
3.  Avoid logging sensitive information such as Secret Key.

-   Do not hardcode the API Key and Secret Key in your code.
-   Your application should be dynamically able to update the API Key and Secret Key.
-   The client credentials should be stored in a vault/a safe place so that it cannot be compromised.

-   OAuth token
    

-   The access token should be stored on the web application server only and must not be exposed to the browser.
-   Do not hardcode the token in your applications.
-   Secure the access tokens to avoid compromising them.
-   Avoid making multiple calls to the OAuth token API for a new access token. It is recommended to cache the access token until the HTTP error code 401 is observed. Regenerate the OAuth token at that time.
-   Do not expose the token to the end user or application.
-   Use HTTPS for any API transaction.

Coding practices

-   To maintain compliance with the latest and most secure data encryption communication protocol, it is recommended to use Transport Layer Security (TLS) version 1.2 or higher.
-   Do not forget to set the right API headers needed for each API request. You will find the header information under each API documentation page. 
-   The ’Content-Type’ in HTTP POST should be ‘application/json’.
-   Please refer to the sample code to get started with each API. Each API endpoint is accompanied by several samples that will help you understand required elements, formats and other details.
-   When users or developers send many decimals in their values, it can cause odd errors. For weight and currency value/amount, only two explicit decimal places are allowed. Dimensions – such as length, width and height – do not support decimals.

**Example**: Weight: 45.26, currency value/amount: 100.52, length: 10, width: 25, height:15.

-   Avoid sending empty elements.

**Example**: “Streetlines”:””

-   Only send data necessary to process the request.

For example, for a U.S. domestic shipment, avoid sending the commercial invoice and commodity data that may only be required for international shipments.

-   When developing, determine how to react if a non-required reply element, such as a rate, is not returned. Evaluate the transaction reply for missing elements before using data.

For example, it is possible to ship a package if the rating is not functional. Test the transaction reply for missing elements before using data.

-   In general, avoid hard dependencies on FedEx API integration when applicable.
-   In order to reduce latency and get accurate results, the following should be used:  
    
    -   Filtering - Use this to narrow down the search with the parameters you are looking for.
    -   Sorting - Use this to sort the results by a certain parameter in ascending or descending order.
    
-   Validate that required fields – such as recipient postal code and package weight – have data before sending the transaction. Validate the data is appropriate for the field in question. This will minimize transaction errors.  
    

For example, for US postal codes, verify that the field is all numeric and is in the form of a 5-digit or a ZIP+4 postal code format.

-   To avoid adverse impact on the FedEx system availability and reliability:  
    
    -   Do not run performance testing in the test or production environment.
    -   Have coding logic in place to keep the same transaction from failing repeatedly.
    
-   The throttling limit is set to 1400 transaction over 10 seconds. If this limit is reached in the first few seconds, HTTP error code **429 Too many requests** will be returned and transactions will be restricted until 10 seconds is reached; transactions will then resume again.  
    

For example, if we receive 1400 requests in the first four seconds, an HTTP error code **429 Too many requests** - ‘We have received too many requests in a short duration. Please wait a while to try again.’ will be returned and transactions will be restricted for the next six seconds and then resume again.

-   Do not hardcode business rules like service types, package types, weight limits, etc. for shipments since they are subject to change.
-   Moreover, to ensure flexibility and future-proofing, we recommend avoiding the hard-coding to specific enumeration values in API responses, as these values may change over time. Instead, implement dynamic logic that can handle new or unexpected values as they arise.

Error handling

Each API response will contain an HTTP status code and response payload. Some responses will be accompanied with an error, warning or note, as applicable. Warnings and notes are not indications of a failure; however, the error or warning message should be logged and examined. Proper error handling will ensure that your integration with FedEx goes smoothly and could help avoid breakage.

HTTP status codes

**200 OK**  
Your request was processed successfully. This is a standard response for successful HTTP requests.

-   Note: The API response can contain notes and warnings that provide informative content. Please be sure to log and parse the messages.

**400 Bad request  
**We received a bad request that we are unable to process. Please modify your request and try again.

-   Note: Please review the error code and message to fix the request and try again. Code only to error codes and not error messages since messages are subject to change dynamically.

**401 Unauthorized  
**We could not authenticate your credentials. Please make sure to cross-check your API keys and try again.

**403 Forbidden  
**We could not authorize your credentials. Please check your permissions and try again.

**404 Not found  
**The resource you requested is no longer available. Please modify your request and try again.

**405 Method not allowed  
**We received a requested method that is not supported. You should only use the methods provided for each endpoint.

For example, to create a shipment you must use POST method as described in an API’s documentation.

**409 Conflict  
**{provide reason of conflict}. Please modify your request and try again.

**415 Unsupported media type  
**We do not support the content type in your request. Please modify the format and try again.

**422 Unprocessable entity  
**We understood the format of your request, but we were unable to process the entity. Please modify your request and try again.

**429 Too many requests  
**We have received too many requests in a short duration. Please make sure to review the [Transaction Quotas & Rate-limits](https://developer.fedex.com/api/en-us/guides/ratelimits.html).

**500 Failure  
**We encountered an unexpected error and are working to resolve the issue. We apologize for any inconvenience. Please check back later and watch out for any communication from FedEx.

**503 Service unavailable  
**The service is currently unavailable, and we are working to resolve the issue. We apologize for any inconvenience. Please check back later and watch out for any communication from FedEx.

Rate

-   There are two ways to get a rate quote:  
    -   Rate for a specific serviceType - The results will be filtered by the serviceType value indicated. This will decrease the size of the reply and reduce the transaction response time.  
        
        **Example:** STANDARD\_OVERNIGHT
        
    -   Rate shop – If no serviceType is indicated, then all the applicable services and corresponding rates will be returned.
-   Use the Service Availability API to determine which services, package options and special services are available for a given origin-destination pair, and pass the serviceType and package option in the Rate request.  
    
    For example, STANDARD\_OVERNIGHT (among others) is not available between all postal codes.
    
-   For a special service to be applied on a shipment, the special service type and its details must be included.   
    
    -   Note: Some special services do not have details.
    
-   View the [Rate API documentation](https://developer.fedex.com/api/en-us/catalog/rate/docs.html).

Ship

-   Use the Service Availability API to determine which services are available for a given origin-destination pair and pass the serviceType and package option in the Ship request.
-   For a special service to be applied on a shipment, the special service type and its details must be included.  
    
    -   Note: Some special services do not have details.
    
-   Perform the close for FedEx Ground at the end of the shipping day before the shipment is picked up.  
    
-   View the [Ship API documentation](https://developer.fedex.com/api/en-us/catalog/ship/docs.html).  
    

Track

-   Limit the number of tracking numbers in a single-track request to 30. This will decrease the size of the reply and reduce the transaction response time.
-   Limit the number of times a package is tracked to what is necessary for business needs.
-   For batch tracking, remove any packages that have returned a track status of “delivered” from batch.
-   FedEx reuses tracking numbers. For best experience provide the date range to avoid duplicate results.
-   View the [Basic Integrated Visibility documentation](https://developer.fedex.com/api/en-us/catalog/track/docs.html).

Address Validation

-   FedEx provides Address Validation as a suggestion and not a final determination. The end user needs to make a final determination of whether an address is usable from the data provided and their business needs. A process must be in place to handle addresses that cannot be validated so orders can still be processed.
-   To ensure a better shipping experience, do not make the shipping process dependent on optional services such as Address Validation.

For example, if Address Validation API is unavailable at the time of order entry or shipping, a contingency should be in place to complete the shipment.

-   View the [Address Validation API documentation](https://developer.fedex.com/api/en-us/catalog/address-validation/docs.html).  
    

FedEx Locations Search

-   Narrow your search by providing specific attributes (i.e., type of location, services offered, etc.) to get suitable location options and faster response time.
-   View the [FedEx Locations Search API documentation](https://developer.fedex.com/api/en-us/catalog/locations/docs.html).  
    

Pickup Request

-   Do not input past ready time, past date or a date that is too far in the future for scheduling a pickup.
-   Anonymous pickups are not allowed.  
    
-   View the [Pickup Request API documentation](https://developer.fedex.com/api/en-us/catalog/pickup/docs.html).  
    

Service Availability

-   To get results for multiple operating companies like FedEx Express (FDXE), FedEx Ground (FDXG), FedEx Freight (FXFR) and FedEx Ground® Economy, either omit the carrierCodes element or send separate service availability requests since multiple carrier codes cannot be specified.
-   Please ensure that you have preapproval for individual skids of 151 lbs. or more and skids exceeding 2,200 lbs.  
    
-   If you specify SATURDAY\_DELIVERY for variable options, you will get both Saturday delivery options and regular options for all services where Saturday delivery is an option. Do not specify SATURDAY\_DELIVERY for special services, or it will only return any applicable Saturday delivery options.
-   View the [Service Availability API documentation](https://developer.fedex.com/api/en-us/catalog/service-availability/docs.html).

Customer support

If you have questions or need assistance, we’re here to help! Please go to our [Support](https://developer.fedex.com/api/en-us/support.html) page for resources and information on ways to contact us.

-   Are you an existing Web Services or FedEx Ship Manager Server Customer? If so, you can still access the [Developer Resource Center](https://www.fedex.com/en-us/developer.html "DRC").
    
-   © FedEx Corporate Services Inc. All rights reserved.

-   [Integration Solutions](https://www.fedex.com/en-us/integration.html)
-   [Support](https://www.fedex.com/en-us/integration/support.html)
-   [FedEx.com](https://www.fedex.com/en-us/home.html)
-   [Terms of Use](https://www.fedex.com/en-us/terms-of-use.html)
-   [Security & Privacy](https://www.fedex.com/en-us/trust-center.html)

-   ![](/api/content/dam/fedex-com/irc/leftnav/globe.png)
-   United States-   English
    
    -   [English](https://developer.fedex.com/api/en-us/guides/best-practices.html)
    -   [Spanish](https://developer.fedex.com/api/es-us/guides/best-practices.html)
    

[![Close](/api/content/dam/fedex-com/irc/common/close.png)](#)

![Error](/api/content/dam/fedex-com/irc/common/error.svg)

## Something went wrong ...

FedEx is unable to process your request. Please try again later.

OKAY  
[CONTACT SUPPORT](https://developer.fedex.com/api/en-us/support.html)

[![Close](/api/content/dam/fedex-com/irc/common/close.png)](https://developer.fedex.com/api/en-us/home.html)

## Your session has timed out.

Please log back in to continue.

OKAY