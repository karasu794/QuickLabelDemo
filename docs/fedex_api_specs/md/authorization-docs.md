# authorization-docs

> Source: https://developer.fedex.com/api/en-us/catalog/authorization/docs.html

                    window.FDX = window.FDX || {}; window.FDX.GDL = window.FDX.GDL || \[\]; var FDX = {}; FDX.contextPath = ""; window.fdx=window.fdx || {}; fdx.context={ envtVar:"", searchUrl:"/services/search", isPublishMode:"true" }; if (!FDX) { var FDX = {}; } FDX.DATALAYER ={}; FDX.GDL = \[\]; FDX.DATALAYER.event=\[\]; FDX.DATALAYER.page = { pageInfo: { pageName: "docs", locale: "en\_us", language:"en", historicalPageName : "", referrer : "", toolUsage:"", viewPort:"", reportSuite:"", region: "us", country:"us", pagePath:"apps\\/fdp\\/catalog\\/authorization\\/docs", securePage : "" }, category: { pageType:"", primaryCategory: "", isApplication:"", appName:"" }, onsiteSearch:{ term:"", suggested: "" }, link:{ data:"", type:"" }, button:{ data:"", type:"" }, assetSearch:{ keyword:"", type:"" } }; let country = "us"; let language = "en"; let pagepath = "apps\\/fdp\\/catalog\\/authorization\\/docs"; let hash = window.location.hash; let pageId = country.toUpperCase().concat("/", language).concat("/", pagepath).concat("", hash).replace("#", ""); window.FDX.GDL.push(\[ 'event:publish', \[ 'page', 'pageinfo', { pageId: pageId } \] \]); FDX.DATALAYER.googleAPIFlag=false; FDX.DATALAYER.inputField=''; FDX.DATALAYER.userType=""; FDX.DATALAYER.locationApp = { googleAPIFlag: "", };    (function(g,b,d,f){(function(a,c,d){if(a){var e=b.createElement("style");e.id=c;e.innerHTML=d;a.appendChild(e)}})(b.getElementsByTagName("head")\[0\],"at-body-style",d);setTimeout(function(){var a=b.getElementsByTagName("head")\[0\];if(a){var c=b.getElementById("at-body-style");c&&a.removeChild(c)}},f)})(window,document,"body {opacity: 0 !important}",3E3);  window\['adrum-start-time'\] = new Date().getTime(); (function(config){ config.appKey = $("#templateConfig").val(); config.adrumExtUrlHttp = 'http://cdn.appdynamics.com'; config.adrumExtUrlHttps = 'https://cdn.appdynamics.com'; config.beaconUrlHttp = 'http://pdx-col.eum-appdynamics.com'; config.beaconUrlHttps = 'https://pdx-col.eum-appdynamics.com'; config.xd = {enable : false}; })(window\['adrum-config'\] || (window\['adrum-config'\] = {})); 

true

![Fedex Logo](/api/content/dam/fedex-com/irc/leftnav/white.png)  

         

    

 [![ Sign Up or Log In](/api/content/dam/fedex-com/irc/leftnav/login-icon_white.svg) Sign Up or Log In](#)

* * *

[](https://www.fedex.com/en-us/developer.html)

-   [Home](https://developer.fedex.com/api/en-us/home.html)
-   [Catalog](https://developer.fedex.com/api/en-us/catalog.html) 
-   [Authorization API](https://developer.fedex.com/api/en-us/catalog/authorization.html) 
-   API Authorization Documentation 

# 

### Introduction

The FedEx APIs support the OAuth 2.0 (bearer token) authentication method to authorize your application API requests with FedEx resources. This OAuth access token needs to be regenerated after every 60 minutes and provided with each API transaction to authenticate and authorize your access to the FedEx resources.

### Authorization API Details

This API allows you to authorize the API requests and it is required to authenticate the FedEx resources. The following section describes the prerequisites for the API:

While registering to FedEx Developer portal, FedEx provides a combination of Client ID (API Key) and Client Secret (Secret Key) to authenticate API requests for your project. Each project under your organization is associated with a combination of Client ID and Client Secret, called as API credentials.

_Note: Customers (Internal, Compatible, Proprietary Parent Child, and Integrators) can contact FedEx representative to obtain API and Secret Keys._

To provide an extra layer of security, the FedEx® customers (Internal, Compatible, Proprietary Parent Child, and Integrators) can send Child Key (Customer Secret) and Child Secret (Customer password) in addition to the API Key and Secret Key to create an OAuth token. This token is used in every API request for authentication.

You can recreate the forgotten Secret Key from the Projects page on the FedEx Developer Portal.

_Note: Creation of new keys will result into code change in your application._

Important information in this document:  

-   Client Key as API Key
-   Client Secret as Secret Key
-   Child Key as Customer Key
-   Child Secret as Customer Password

API credentials serve the following purposes:

-   They identify the project making a call to the APIs.
-   They authorize access to the APIs that are enabled under your project.

### How to get API Credentials

Credentials are created based on inputs in the FedEx Developer Portal:

-   **Client ID** – API Key (Client ID) gets created when a project is created on FedEx Developer portal. You can also view the API Key associated with the project on the **Project Overview** page.
-   **Client Secret** – You will see the Secret Key (Client Secret) on the confirmation page once a project is created on the FedEx Developer portal. If needed, the Secret Key can also be regenerated, on the **Project Overview** page.

_Note: FedEx® customers (Internal, Compatible, Proprietary Parent Child, and Integrators) need to send Child Key (Customer Secret) and Child Secret (Customer password) in addition with API Key and Secret Key for creating OAuth token. Refer Account Registration API for how to get Child Key and Child Secret._

### How the Authorization API Works

**API Authorization**

Once you have secured the API credentials on FedEx Developer portal, the OAuth endpoint is used to get an access token which is used as credentials with each API transaction.  
  
These are the required inputs associated with the OAuth request:

-   grant\_type – Type of customer. (Valid values: client\_credentials, csp\_credentials, client\_pc\_credentials)
-   client\_id – Refers to the Project API Key.
-   client\_secret – Refers to the Project API Secret Key.

For FedEx® Internal, Compatible, Proprietary Parent Child, and Integrator customers, need to send the below additional inputs:

-   child\_id – Customer Key returned through Credential Registration API request.
-   child\_secret – Customer password returned through Credential Registration API request

The result of this request should return below:

-   access\_token – The encrypted OAuth token that needs to be used in the API transaction.
-   token\_type – Type of token. In this case, it is _bearer authentication_.
-   expires\_in – Token expiration time in seconds. One hour is the standard Token expiration time.
-   Scope – Scope of authorization provided to the consumer.

**Examples**

Request:

_POST /oauth/token HTTP/1.1  
grant\_type= client\_credentials&client\_id=your client ID&client\_secret=Your secret_

Response:

_{ ″access\_token″: ″eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX……..″,  
″token\_type″: ″bearer″,  
″expires\_in″: 3600,  
″scope″: ″CXS″  
}_

Request For FedEx® Internal, Compatible, and Integrator customers:

_POST /oauth/token HTTP/1.1  
grant\_type= csp\_credentials&client\_id=Client ID&client\_secret= Client secret&child\_key=Child key&child\_secret=Child Secret_

Response:

_{ ″access\_token″: ″eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX……..″,  
″token\_type″: ″bearer″,  
″expires\_in″: 3600,  
″scope″: ″CXS″  
}_

Request For FedEx® Proprietary Parent Child customers:

_POST /oauth/token HTTP/1.1  
grant\_type= client\_pc\_credentials&client\_id=Client ID&client\_secret= Client secret&child\_key=Child key&child\_secret=Child Secret_

Response:

_{ ″access\_token″: ″eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX……..″,  
″token\_type″: ″bearer″,  
″expires\_in″: 3600,  
″scope″: ″CXS″  
}_

_Note: The access token expires in an hour, it can be regenerated by using a POST request to the oauth/token endpoint._

     

CLOSE ![](/api/content/dam/fedex-com/irc/tryout/close.svg)

-   Request
-   Response

Payload:

Header Parameters

[EDIT HEADER](#)

* * *

[RESET](#) [SAVE](#)

Query Parameters

Path Parameters

Body

SEND

Response

Copy

LOG IN

FORGOT PASSWORD OR USER ID?

* * *

Get access to FedEx APIs by creating a user ID.

SIGN UP

  

 

-   Are you an existing Web Services or FedEx Ship Manager Server Customer? If so, you can still access the [Developer Resource Center](https://www.fedex.com/en-us/developer.html "DRC").
    
-   © FedEx Corporate Services Inc. All rights reserved.

-   [Integration Solutions](https://www.fedex.com/en-us/integration.html)
-   [Support](https://www.fedex.com/en-us/integration/support.html)
-   [FedEx.com](https://www.fedex.com/en-us/home.html)
-   [Terms of Use](https://www.fedex.com/en-us/terms-of-use.html)
-   [Security & Privacy](https://www.fedex.com/en-us/trust-center.html)

-   ![](/api/content/dam/fedex-com/irc/leftnav/globe.png)
-   United States-   English
    
    -   [English](https://developer.fedex.com/api/en-us/catalog/authorization/docs.html)
    -   [Spanish](https://developer.fedex.com/api/es-us/catalog/authorization/docs.html)