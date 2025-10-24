# postal-code-docs

> Source: https://developer.fedex.com/api/en-cm/catalog/postal-code/docs.html

                    window.FDX = window.FDX || {}; window.FDX.GDL = window.FDX.GDL || \[\]; var FDX = {}; FDX.contextPath = ""; window.fdx=window.fdx || {}; fdx.context={ envtVar:"", searchUrl:"/services/search", isPublishMode:"true" }; if (!FDX) { var FDX = {}; } FDX.DATALAYER ={}; FDX.GDL = \[\]; FDX.DATALAYER.event=\[\]; FDX.DATALAYER.page = { pageInfo: { pageName: "docs", locale: "en\_cm", language:"en", historicalPageName : "", referrer : "", toolUsage:"", viewPort:"", reportSuite:"", region: "us", country:"cm", pagePath:"apps\\/fdp\\/catalog\\/postal\\u002Dcode\\/docs", securePage : "" }, category: { pageType:"", primaryCategory: "", isApplication:"", appName:"" }, onsiteSearch:{ term:"", suggested: "" }, link:{ data:"", type:"" }, button:{ data:"", type:"" }, assetSearch:{ keyword:"", type:"" } }; let country = "cm"; let language = "en"; let pagepath = "apps\\/fdp\\/catalog\\/postal\\u002Dcode\\/docs"; let hash = window.location.hash; let pageId = country.toUpperCase().concat("/", language).concat("/", pagepath).concat("", hash).replace("#", ""); window.FDX.GDL.push(\[ 'event:publish', \[ 'page', 'pageinfo', { pageId: pageId } \] \]); FDX.DATALAYER.googleAPIFlag=false; FDX.DATALAYER.inputField=''; FDX.DATALAYER.userType=""; FDX.DATALAYER.locationApp = { googleAPIFlag: "", };    (function(g,b,d,f){(function(a,c,d){if(a){var e=b.createElement("style");e.id=c;e.innerHTML=d;a.appendChild(e)}})(b.getElementsByTagName("head")\[0\],"at-body-style",d);setTimeout(function(){var a=b.getElementsByTagName("head")\[0\];if(a){var c=b.getElementById("at-body-style");c&&a.removeChild(c)}},f)})(window,document,"body {opacity: 0 !important}",3E3);  window\['adrum-start-time'\] = new Date().getTime(); (function(config){ config.appKey = $("#templateConfig").val(); config.adrumExtUrlHttp = 'http://cdn.appdynamics.com'; config.adrumExtUrlHttps = 'https://cdn.appdynamics.com'; config.beaconUrlHttp = 'http://pdx-col.eum-appdynamics.com'; config.beaconUrlHttps = 'https://pdx-col.eum-appdynamics.com'; config.xd = {enable : false}; })(window\['adrum-config'\] || (window\['adrum-config'\] = {})); 

true

![Fedex Logo](/api/content/dam/fedex-com/irc/leftnav/white.png)  

         

    

 [![ Sign Up or Log In](/api/content/dam/fedex-com/irc/leftnav/login-icon_white.svg) Sign Up or Log In](#)

* * *

[](https://www.fedex.com/en-us/developer.html)

-   [IRC](/content/fedex-com/irc.html) 
-   [United States English](/content/fedex-com/irc/sites/cm/en_cm.html) 
-   [Catalog](https://developer.fedex.com/api/en-cm/catalog.html) 
-   [Postal Code Validation API](https://developer.fedex.com/api/en-cm/catalog/postal-code.html) 
-   Postal Code Validation API Documentation 

# 

### Introduction

FedEx Postal Code Validation API enables FedEx customers to validate postal codes and get the service commitments. It supports city, postal, country and Origin-Destination related lookups and the validations. It returns verified postal and location details in the reply.

### Postal Code Validation API Details

The Postal Code Validation validates the postal codes for countries and cities and provides the cleaned postal code as a response. The correctly formatted postal codes are mandatory to process a shipment or create shipping labels.

This API uses the provided input information such as ship date, postal code, country code and other various information and checks for mismatch between state and city values. The City and State is set if a mismatch is found and if country is U.S. or CA. For examples: FDXE - FedEx Express®, FDXG - FedEx Ground® and FXSP - FedEx Ground® Economy (Formerly known as FedEx SmartPost®). The API validates the given input and provides location details and cleaned postal code.

FedEx supports services to both postal aware countries and non-postal aware countries.

**Postal aware countries**

Shipments to these countries should include the postal codes on the airway bills and other documentation to help reduce delays and maximize efficiency. FedEx Express customers should be encouraged to include valid postal codes in their addresses for recipients located in the below countries.

For more information on the Postal aware countries refer to [Postal Aware Countries](https://developer.fedex.com/api/en-cm/guides/api-reference.html#postalawarecountries).

**Non–Postal aware countries**

As the name suggests, there are non-postal aware countries supported by FedEx that do not mandate postal codes in their shipments. State code or city name is enough when customer is shipping to a country which does not have a postal code. If validation error occurs for a country that does not use ZIP codes, try to force the address through by entering \\"00000\\" as a replacement postal code. Using this false postal code should not cause issues, as it does not exist.

The following are the benefits of using FedEx Postal Code Validation API:

-   Reduces Shipping delays and increases efficiency.
-   Increases number of on-time and complete deliveries.
-   Improves FedEx service to urban areas, offering flexibility in cutoff times and pickup schedules.

### How Postal Code Validation API works

The FedEx Postal Code Validation uses the below endpoint to validate the postal codes for cities, countries and origin-destination. The following section describes the key inputs and responses for the endpoint:

**Validate Postal**

This request is used to return postal details, cleaned postal code and location description based on input details. The key input information associated with this request are as follows:

-   carrierCode
-   countryCode
-   stateOrProvinceCode
-   postalCode
-   shipDate

The successful result of this request are _locationdetails_ and _cleanedpostalcode_ for the provided input. The request would fail if the postalcode is not valid for example CountryCode, State/Province and ZIP/Postal code combination is not valid.

**Clarification of Common Misconceptions**

-   It is not possible to cross-reference territory alignment to ZIP/postal alignment because these are distinctly separate alignment process outputs.
-   Not all geographic locations in the world have postal or ZIP codes.

For more information on the Region Specific list, refer to [Region Specific Service List.](https://developer.fedex.com/api/en-cm/guides/api-reference.html#regionspecificserviceslist)

### Business Rules

-   Combination of number, street name, etc. At least one line is required for a valid physical address; empty lines within the address are not allowed.
-   2-letter State or province code is required if recipient country is U.S. or Canada, or if EEI applies and country is Mexico {MX}.
-   Descriptive data for a physical location, may be used as an actual physical address (place to which one could go), or as a container of \\"address parts\\" which should be handled as a unit (such as a city state-ZIP combination within the U.S.).
-   Format and presence of postal code field will vary depending on country.

### JSON API Collection

Explore our JSON API collection to see how we can deliver on your business needs. Test your integration with these sample requests.

[Learn more about sandbox virtualization guide](https://developer.fedex.com/api/en-cm/guides/sandboxvirtualization.html)

    

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
-   [FedEx.com](https://www.fedex.com/en-cm/home.html)
-   [Terms of Use](https://www.fedex.com/en-cm/terms-of-use.html)
-   [Security & Privacy](https://www.fedex.com/en-us/trust-center.html)

-   ![](/api/content/dam/fedex-com/irc/leftnav/globe.png)
-   Cameroon-   English
    
    -   [English](https://developer.fedex.com/api/en-cm/catalog/postal-code/docs.html)