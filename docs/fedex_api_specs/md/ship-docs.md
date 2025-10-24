# ship-docs

> Source: https://developer.fedex.com/api/en-us/catalog/ship/docs.html

                    window.FDX = window.FDX || {}; window.FDX.GDL = window.FDX.GDL || \[\]; var FDX = {}; FDX.contextPath = ""; window.fdx=window.fdx || {}; fdx.context={ envtVar:"", searchUrl:"/services/search", isPublishMode:"true" }; if (!FDX) { var FDX = {}; } FDX.DATALAYER ={}; FDX.GDL = \[\]; FDX.DATALAYER.event=\[\]; FDX.DATALAYER.page = { pageInfo: { pageName: "docs", locale: "en\_us", language:"en", historicalPageName : "", referrer : "", toolUsage:"", viewPort:"", reportSuite:"", region: "us", country:"us", pagePath:"apps\\/fdp\\/catalog\\/ship\\/docs", securePage : "" }, category: { pageType:"", primaryCategory: "", isApplication:"", appName:"" }, onsiteSearch:{ term:"", suggested: "" }, link:{ data:"", type:"" }, button:{ data:"", type:"" }, assetSearch:{ keyword:"", type:"" } }; let country = "us"; let language = "en"; let pagepath = "apps\\/fdp\\/catalog\\/ship\\/docs"; let hash = window.location.hash; let pageId = country.toUpperCase().concat("/", language).concat("/", pagepath).concat("", hash).replace("#", ""); window.FDX.GDL.push(\[ 'event:publish', \[ 'page', 'pageinfo', { pageId: pageId } \] \]); FDX.DATALAYER.googleAPIFlag=false; FDX.DATALAYER.inputField=''; FDX.DATALAYER.userType=""; FDX.DATALAYER.locationApp = { googleAPIFlag: "", };    (function(g,b,d,f){(function(a,c,d){if(a){var e=b.createElement("style");e.id=c;e.innerHTML=d;a.appendChild(e)}})(b.getElementsByTagName("head")\[0\],"at-body-style",d);setTimeout(function(){var a=b.getElementsByTagName("head")\[0\];if(a){var c=b.getElementById("at-body-style");c&&a.removeChild(c)}},f)})(window,document,"body {opacity: 0 !important}",3E3);  window\['adrum-start-time'\] = new Date().getTime(); (function(config){ config.appKey = $("#templateConfig").val(); config.adrumExtUrlHttp = 'http://cdn.appdynamics.com'; config.adrumExtUrlHttps = 'https://cdn.appdynamics.com'; config.beaconUrlHttp = 'http://pdx-col.eum-appdynamics.com'; config.beaconUrlHttps = 'https://pdx-col.eum-appdynamics.com'; config.xd = {enable : false}; })(window\['adrum-config'\] || (window\['adrum-config'\] = {})); 

true

![Fedex Logo](/api/content/dam/fedex-com/irc/leftnav/white.png)  

         

    

 [![ Sign Up or Log In](/api/content/dam/fedex-com/irc/leftnav/login-icon_white.svg) Sign Up or Log In](#)

* * *

[](https://www.fedex.com/en-us/developer.html)

-   [Home](https://developer.fedex.com/api/en-us/home.html)
-   [Catalog](https://developer.fedex.com/api/en-us/catalog.html) 
-   [Ship API](https://developer.fedex.com/api/en-us/catalog/ship.html) 
-   Ship API Documentation 

# 

![info-icon](/api/content/dam/fedex-com/irc/common/newWarning.svg)

Effective September 15, 2025: A FedEx account number is required for FedEx International Connect Plus (FICP) service non-document shipments. This applies to shipments from APAC countries and territories to U.S. or PR with duty and tax bill-to recipient if any shipment commodities’ country of manufacture is AU, CN, HK, ID, JP, KR, MO, MY, NZ, PH, SG, TH, TW, VN (APAC countries and territories).

### Introduction

To use FedEx APIs, you should first learn the various aspects of FedEx® services. This documentation enables you to gather FedEx shipping business knowledge and understand various shipping options, rules and guidelines. These resources will help you with answers to all your questions related to the shipping domain and equip you to use FedEx APIs for your shipments.

### Ship API Details

The Ship API allows you to integrate FedEx shipping capabilities into your application. Using Ship API, you can process and submit shipping requests for packages to FedEx for both domestic and international shipments, as well as the return shipments.

Each shipment request will contain detailed information for shipment and packages.

FedEx Shipping categorized as

-   Domestic Shipping
-   International Shipping

### How Ship API Works

The following are the features available with this API:

**Create Shipment**

Use this endpoint for creating FedEx shipment with all the necessary shipping information.

The required input information associated with this request are as follows:

-   Account Number – The FedEx shipping account number.
-   Pickup Type – Indicates if shipment is being dropped off at a FedEx location or is being picked up by FedEx. Indicates if it is a regularly scheduled pickup or a new one being scheduled for this shipment. Required for FedEx Express, FedEx Ground and FedEx Ground® Economy (Formerly known as FedEx SmartPost®).
-   Service Type – The type of service that is used to ship the package.
-   Packaging Type – Packaging used for the package.
-   Shipper Information.
-   Recipient Information.
-   Shipping Payment Type (SENDER/RECIPIENT/THIRD\_PARTY/ACCOUNT. etc.)
-   Payer Information – This element is optional when the payment type provided is a SENDER.
-   Individual Package Weights.
-   Label Specification – Details about the image type, printer format, and label stock for label. You can also specify customer specific details such as doc-tab content, regulatory labels, and mask data on the label.
-   processingOptions -This field is optional, select the appropriate enumeration value to receive on-call pickup rates per stop.
-   requestType - Select the appropriate enumeration value to receive pick up rate quotes for future day or same day shipments.

The successful response to this request will provide the tracking number and label information which will be helpful in shipment tracking.

_Note: In order to avoid entering bad data on the label and in to the FedEx systems, do not feed non ASCII characters in to your Create Shipment request._

**Validate Shipment**

This endpoint allows you to validate the accuracy of a shipment details prior to submitting the final shipment request. This feature also allow businesses that receive shipping orders from end-user customers to validate some of the shipment information prior to submitting a create shipment request to FedEx and printing a label. If for any reason the information needs to be edited or changed, it can be done while the end-user is still available to confirm the changes. This endpoint helps you identify and correct the errors in the shipment before actually being submitted.

_Note: This request does not validate the street address details._

The required input information associated with this request are as follows:

-   Account Number – The FedEx shipping account number.
-   Pickup Type – Indicates if shipment is being dropped off at a FedEx location or is being picked up by FedEx. Indicates if it is a regularly scheduled pickup or a new one being scheduled for this shipment. Required for FedEx Express, FedEx Ground and FedEx Ground® Economy.
-   Service Type – The type of service that is used to ship the package.
-   Packaging Type – Packaging used for the package.
-   Shipper Information.
-   Recipient Information.
-   Shipping Payment Type (SENDER/RECIPIENT/THIRD\_PARTY/ACCOUNT. etc.)
-   Payer Information – This element is optional when the payment type provided is a SENDER.
-   Individual Package Weights.
-   Label Specification – Details about the image type, printer format, and label stock for label. You can also specify customer specific details such as doc-tab content, regulatory labels, and mask data on the label.

The successful response to this request is 200 OK with transaction id. In case of invalid or incorrect shipment data, the output will return the errors, warnings, notes and alerts in the response so that those can be corrected and shipment can be revalidated by fixing the issues.

Following are the Important Points regarding this endpoint:

-   This is shipment level validation hence supports validation for single piece shipment only.
-   Shipment validation is supported for all Express and Ground – Domestic as well as international shipments with all applicable special services.
-   Shipment validation is supported for FedEx Ground® Economy and not for Freight LTL shipment.

**Retrieve Async Ship**

Use this endpoint to retrieve the shipments processed asynchronously using the job ID.

The required input information associated with this request are as follows:

-   jobId
-   accountNumber

The successful response to this request will return all the label and shipments report details for the respective jobId. In case the output returned has errors, resubmit the shipment by fixing the issues.

**Cancel Shipment**

Use this request to cancel already created FedEx shipment/package that have already been tendered to FedEx.

The required input information associated with this request are as follows:

-   Tracking number.
-   Account Number – The FedEx shipping account number.

_Note: If the shipment to be cancelled is an email return shipment, then specify emailReturnShipment as "true"._

The output of this request will return an indicator and a message to conclude whether the shipment is cancelled.

Important Notes:

-   With the controlled parameter (deletioncontrol) value, you can specify if only one or all the packages in a shipment must be deleted.
-   For FedEx Express international multiple-piece shipments, if you enter the master tracking number, all packages associated with this shipment are deleted. If you attempt to delete one package in a shipment, the label sequence number will be incorrect, and you may experience clearance issues in customs if you cannot account for all packages in the shipment.
-   For FedEx International Ground multiple-piece shipments, if you enter any tracking number associated with the master shipment, all packages associated with the shipment are deleted.
-   For FedEx Ground U.S. multiple-piece shipments, you may enter a single tracking number to delete one package in the shipment. Since FedEx Ground U.S. multiple-piece shipments labels are not associated with sequential numbers (1 of 2, 2 of 2), you do not need to delete the entire shipment.
-   For FedEx Express C.O.D. multiple-piece shipments, enter any tracking number in the shipment to delete the entire shipment. For FedEx Ground® C.O.D. multiple-piece shipments, you must delete each individual package.

**Error condition and Tips:**

If you are unable to delete the package or shipment, you will receive an error condition. This error condition indicates that:

-   For FedEx Express shipments, the package has already been tendered to FedEx.
-   You have entered an invalid account number.
-   The account number, while valid, is not associated with the tracking number.
-   You entered an invalid tracking number. This applies to FedEx Ground shipments only. FedEx Express accepts any number with the correct number of digits.

**Create Tag**

FedEx creates and delivers a return shipping label to customer and collects the item for return. Customer needs to have the package ready for pickup when the FedEx driver arrives. Use this option to create tag requests for FedEx Express and FedEx Ground shipments.

The required input and some key information associated with this request are as follows:

-   Account Number – The FedEx shipping account number.
-   Pickup details – Details for scheduling the pickup.
-   Service Type – The type of service that is used to ship the package.
-   Packaging Type – Packaging used for the package.
-   Shipper Information.
-   Recipient Information.
-   Shipping Payment Type (SENDER/RECIPIENT/THIRD\_PARTY/ACCOUNT. etc.)
-   Special Services – Optional special services requested for the shipment.
-   Label Specification – Details about the image type, printer format, and label stock for label. You can also specify customer specific details such as doc-tab content, regulatory labels, and mask data on the Label.

The output of this request will return a confirmation number, applicable FedEx Express service and the dispatch date for the successful Create Tag request.

**Cancel Tag**

Use this option to cancel a FedEx Return Tag and the associated pickup for FedEx Express and FedEx Ground shipments if the shipment has not yet been picked up by the courier.

The following elements are required to cancel a tag:

-   Account Number – The FedEx shipping account number.
-   Service Type
-   Confirmation number
-   Dispatch Date
-   Location

The output of this request will return an indicator, e.g., cancelled tag value (True or false) along with a message for the successful FedEx tag cancellation request.

### U.S. Express Shipping

You can ship within the U.S. with a variety of FedEx delivery services, from emergency same day to less urgent delivery options.

Services associated with U.S. Express shipping:

**Next Business Day Delivery**

FedEx First Overnight®

FedEx provides delivery first thing the next business day morning by 8 a.m., 8:30 a.m., 9 a.m. or 9:30 a.m. to most areas and by 10 a.m., 11 a.m. or 2 p.m. to extended areas. Saturday pickup and delivery services are available in many areas for an additional charge. \[Service ENUM : FIRST\_OVERNIGHT\]

FedEx Priority Overnight®

FedEx provides next business day delivery by 10:30 a.m. to most U.S. addresses; by noon, or 5 p.m. Deliveries are also made on saturday by noon, 1:30 p.m. or 5 p.m. It also provides delivery in 2 business days for certain shipments to and from Alaska and Hawaii. \[Service ENUM : FEDEX\_PRIORITY\_OVERNIGHT\]

FedEx Standard Overnight®

FedEx provides delivery the next business day in the afternoon by 3 p.m. to most U.S. addresses and by 5 p.m. or by 8 p.m. to residences. \[Service ENUM : STANDARD\_OVERNIGHT\]

**2 or 3 Business Day Delivery**

FedEx 2Day® A.M.

FedEx provides second business day delivery by 10:30 a.m. to most U.S. addresses and by noon to rural areas. Monday to Friday service days with Saturday pickup available in many areas for an additional charge. \[Service ENUM : FEDEX\_2\_DAY\_AM\]

FedEx 2Day®

FedEx provides second business day delivery by 5 p.m. to most areas (by 8 p.m. to residences). Monday to Friday service days with Saturday pickup and delivery available in many areas for an additional charge. It also provides delivery in 3 business days for certain shipments to Alaska and Hawaii. \[Service ENUM : FEDEX\_2\_DAY\]

FedEx Express Saver®

FedEx provides third business day delivery by 5 p.m. to most areas (by 8 p.m. to residences). FedEx Express saver is not supported for the Email return shipment. \[Service ENUM : FEDEX\_EXPRESS\_SAVER\]

**Business Delivery via Ground**

FedEx Ground®

FedEx provides day-definite delivery in 1–5 business days (3–7 business days to and from Alaska and Hawaii) based on distance to destination. It also provides delivery by end of business day. FedEx Ground Multiweight® rating can help you save money on multiple-piece shipments weighing 200 lbs. or more. \[Service ENUM : FEDEX\_GROUND\]

**Residential Delivery via Ground**

FedEx Home Delivery®

Day-definite residential delivery in 1–7 business days (3–7 business days to and from Alaska and Hawaii) based on distance to destination. Package weight and size can be up to 150 lbs., 108″ in length, or 165″ in combined length plus girth (L+2W+2H). Shipment can originate from and be delivered to 50 States within U.S., although longer transit times apply to Alaska and Hawaii. Delivery by end of day is available to every U.S. residential address Monday to Friday and Saturday to most and many on Sunday. \[Service ENUM : GROUND\_HOME\_DELIVERY\]

FedEx Date Certain Home Delivery

FedEx contains the recipient information (recipient's phone number is required in transaction) and schedules package delivery for a specific date. \[Service ENUM : DATE\_CERTAIN\]

FedEx Evening Home Delivery

Just like ‘Date Certain Delivery’, FedEx contains the customer (recipient phone number is required in transaction) and schedules an evening package delivery. \[Service ENUM : EVENING\]

FedEx Appointment Home Delivery

This option is time specific. For example, if you want your package delivered at 1.30 on Tuesday, FedEx calls the recipient to confirm this date and time. The recipient phone number is required in the transaction. \[Service ENUM : APPOINTMENT\]

_Note:_

-   _FedEx Home Delivery convenient delivery options are requested on the shipment level and incur surcharges._
-   _To receive Convenient Delivery Options (CDOs) notification link, you need to specify correct mobile number that can receive SMS, in the request._

**FedEx Ground® Economy (Formerly known as FedEx SmartPost®)**

FedEx provides shipping for low-weight packages to residences; P.O. boxes, APO, FPO and DPO destinations. Delivery typically in 2–7 business days based on distance to destination (longer time-in-transit outside the contiguous 48 states). FedEx routes packages to a U.S. Post Office facility for final delivery. This is a Contract-only service and allows Packages up to 70 lbs. \[Service ENUM : SMART\_POST\]  

For more information, [FedEx Ground® Economy section.](#smartpost) 

### International Shipping

FedEx offers international shipping from anywhere to anywhere, which means you can create shipping transactions both to and from any country where FedEx provides its services. FedEx enables you to implement FedEx services as an integrated shipping solution for your international business.  

Following are the international shipping services grouped based on their speed of delivery:  

****Fastest Delivery (1, 2 or 3 Business Day Delivery)**  
**

FedEx International First®  

FedEx provides package delivery in 1, 2 or 3 business days to select postal codes in 20 key global locations. Delivery by 10 a.m. in 1 business day to Canada and by 11 a.m. in 1 business day to Mexico (2 business days for non-document shipments to Mexico) and provides delivery to select U.S. ZIP codes by 8, 8:30, 9 or 9:30 a.m. to most areas. \[Service ENUM : INTERNATIONAL\_FIRST\]  

FedEx International Priority®  

FedEx provides package delivery typically in 1, 2 or 3 business days to more than 220 countries and territories. Provides fastest deliveries to major cities in Canada and Mexico typically in 1 business day and major cities in Europe and Asia by noon typically in 2 business days. U.S. inbound package delivery by 10:30 a.m. or noon to many locations. \[Service ENUM : INTERNATIONAL\_PRIORITY\]  

FedEx International Priority® Express (2A)  

This is a new international mid-day timed commitment, customs-cleared, door-to-door (DTD) delivery service. Delivery is typically in 1 - 3 business days, backed by the FedEx Money-Back Guarantee (MBG).  

To request this service, send ServiceType value as FEDEX\_INTERNATIONAL\_PRIORITY\_EXPRESS.  

Following are the benefits associated with this service:  

-   Fast and reliable delivery
-   Delivery typically occurs in 1 to 3 business days
-   Shipment delivery standard is by noon, in 2 business days to dozens of cities
-   Overnight delivery from major cities in Europe, Middle East, Asia, Mexico, and South America to many U.S. cities
-   Package weight up to 68 kilograms or 150 pounds
-   More control over delivery commitment
-   Flexibility for recipients to manage inbound volume arrival
-   Greater choice of timed options for international express parcel services

_Label Identification:_  

‘IP EXP’ is displayed on label when FedEx International Priority Express service is selected.

FedEx International Priority® (2P)

This is a new international end of the day timed commitment, customs-cleared, door-to-door (DTD) delivery service. Delivery is typically in 1 - 3 business days, backed up by the FedEx Money-Back Guarantee (MBG).

To request this service, send ServiceType value as FEDEX\_INTERNATIONAL\_PRIORITY.

Following are the benefits associated with this service:

-   Reliable delivery
-   More control over delivery commitment
-   Flexibility for recipients to manage inbound volume arrival
-   Greater choice of timed options for international express parcel services
-   Next day 5 p.m. delivery to majority of U.S. key business centers available from EuroOne origins in number of European markets
-   Late bundled pickup time for parcel shipments to the US and elsewhere
-   Improved Europe to U.S. value proposition

_Label Identification:_

'IP EOD' is displayed on label when FedEx International Priority service is selected.

**Flat-Rate International Shipping**

FedEx® 10kg Box and FedEx® 25kg Box

An easy, economical way to ship internationally. Pay a flat rate (based on destination) when you ship up to 22 lbs. in the FedEx 10kg Box and up to 56 lbs. in the FedEx 25kg Box delivery via FedEx International Priority typically in 1, 2 or 3 business days to more than 220 countries and territories. \[Service ENUM : FEDEX\_10KG\_BOX and FEDEX\_25KG\_BOX\]

**2-5 Business Day Delivery**

FedEx International Economy®

FedEx provides cost-effective package delivery (typically in 2–5 business days) to more than 215 countries and territories and provides delivery in 2-3 business days to Canada, Mexico and Puerto Rico. \[Service ENUM : INTERNATIONAL\_ECONOMY\]

FedEx International Connect PlusTM

A new FedEx International Connect PlusTM is a contractual service that offers shipping options with varying prices that are less expensive and similar to FedEx International priority® service. It also provides you the complete control over your package with an advantage of faster and convenient deliveries. \[Service ENUM : FEDEX\_INTERNATIONAL\_CONNECT\_PLUS\]

Feature details:

-   An international, day-definite, end of day delivery for your e-commerce business
-   Typically delivering in 2-5 business days
-   Only contractually available in select markets
-   No money back guarantee.

To Request this service, specify the service enum value in the _serviceType_ element.

Note: For more information on this service, contact your FedEx Support Representative.

**5-10 Business Day Delivery**

FedEx International Deferred Freight (FDF)

FedEx International Deferred Freight (FDF) is a global air freight shipping service for shipping international air freight shipments with extended delivery/transit times at economical rates. FDF is also available for Airport-to-Airport, Door-to-Airport, Airport-to-Door, and Door-to-Door delivery services.  
\[Service ENUM: FEDEX\_INTERNATIONAL\_DEFERRED\_FREIGHT\]

_Note:_

-   _Currently this service is only available for selected country to country lanes._
-   _Dangerous Goods (DG) and Restricted Commodities are not allowed. Example: Dry ice, lithium ion batteries. Please reach out to FedEx customer support for more information._
-   _U.S. domestic shipments and non-U.S. domestic shipments are not allowed._

**Regional Economy Services**

FedEx® Regional Economy  

FedEx® Regional Economy is an intra-Europe, day-definite, customs-cleared, door-to-door economy service for less urgent shipments up to 68kg per package.

To request this service, send ServiceType value as FEDEX\_REGIONAL\_ECONOMY.

Following are the benefits associated with this service:

-   Provides delivery typically in 1 to 4 business days for Europe destinations.
-   Available in European countries as both origins and destinations. (Austria, Belgium, Bulgaria, Croatia, Czech Republic, Denmark, Estonia, Finland, France, Germany, Greece, Hungary, Ireland, Italy, Latvia, Lithuania, Luxembourg, Netherlands, Norway, Poland, Portugal, Romania, Serbia, Slovakia, Slovenia, Spain, Sweden, Switzerland, United Kingdom).
-   Offers door-to-door service and day definite delivery commitment.

Business Rules applicable for FedEx® Regional Economy Service are:

-   Service days are Monday through Friday, with Saturday delivery available to regions where Saturday is a regular business day.
-   Applicable for diesel based fuel surcharge, different DIM factor of 4000 (for new FedEx customers), no MBG, no FedEx branded packaging and no manual/paper AWB.

_Label Identification_

'RGNL ECONOMY' is displayed on label when FedEx® Regional Economy service is selected.

FedEx® Regional Economy Freight

FedEx® Regional Economy Freight is an intra-Europe, day-definite, customs-cleared, door-to-door economy service for less urgent shipments with packages above 68kg.

To request this service, send ServiceType value as FEDEX\_REGIONAL\_ECONOMY\_FREIGHT.

The following are the benefits associated with this service:

-   Provides time-definite service, typically in 2-5 business days, for European destinations for shipments above 68kg per package.
-   Available in 22 European countries as both origins and destinations . Austria, Belgium, Czech Republic, Denmark, Estonia, Finland, France, Germany, Hungary, Ireland, Italy, Latvia, Lithuania, Luxembourg, Netherlands, Norway, Poland, Slovenia, Spain, Sweden, Switzerland, United Kingdom).
-   Service days are Monday through Friday, with Saturday delivery available to countries where Saturday is a regular business day.
-   End of the day delivery commitment based on location.

The following special services are allowed (depending on destination location):

-   FedEx International Broker
-   Hold at Location

Business Rules applicable for FedEx® Regional Economy Freight Service:

-   Service days are Monday through Friday, with Saturday delivery available to regions where Saturday is a regular business day.
-   FedEx International Saturday is applicable based on region.
-   Applicable for diesel based fuel surcharge, different DIM factor of 4000 (for new FedEx customers), no MBG, no FedEx branded packaging and no manual/paper AWB.

_Label Identification:_

'RGNL ECON FRT' is displayed on label when FedEx® Regional Economy Freight service is selected.

**Rules for European Union (EU)**

Value-Added Tax (VAT) for EU Imports

The below rules are applicable for EU Imports.

-   All goods imported to the EU are subjected to VAT regardless of previous value exceptions.
-   VAT for consignments of €150 or below, can either be charged at the time of sale using the new Import One-Stop-Shop (IOSS) or collected from the end customer by the customs declarant (e.g., FedEx)
-   These VAT Rules are not applicable for EU businesses selling within the EU member states.

Import One-Stop Shop (IOSS)

The Import One-Stop Shop (IOSS) is the electronic portal businesses use to comply with VAT e-commerce obligations on distance sales of imported goods. IOSS allows suppliers to sell imported goods to buyers in the European Union (EU) to collect, declare and pay the VAT to the revenue authorities.

_Note: Information on the VAT rates in the EU is available on both the European Commission website and on the websites of national tax administrations._

The IOSS covers the sale of goods from a distance that are,

-   dispatched or transported from outside of the EU at the time of sale

-   dispatched or transported in consignments with a value not exceeding a total of €150 (low value goods) even if the order contains more than one item

-   dispatched or transported in consignments with a value not exceeding a total of €150 (low value goods) even if the order contains more than one item

How to use IOSS Number in shipment

To use IOSS with EU import shipment,

1.  Register with Import One-Stop Shop (IOSS) system at  Import One Stop Shop (IOSS) and get the IOSS number. 
2.  Specify the unique IOSS number in the shipment request element shipper\\tins\\number field during Ship request transaction

**Ground Delivery to Canada**  

FedEx International Ground®

FedEx provides economical day-definite ground package delivery to Canada typically in 2–7 business days. The packages are delivered by end of the business day. FedEx Ground Multiweight rating can help you save money on multiple-piece shipments weighing 150 lbs. or more. Customs clearance is included through our brokerage-inclusive service (a fee applies). \[Service ENUM : FEDEX\_GROUND\]

### International shipping and packaging Options

In addition to standard FedEx Express packaging, you may also choose a FedEx 10kg Box or a FedEx 25kg Box. The weight limit is 22 lbs. for a FedEx 10 kg Box and 55 lbs. for a FedEx 25 kg Box. These packaging options are allowed for FedEx International Priority® to more than 220 countries and territories.

-   Document Shipments
-   Commodity Shipments

**Document Shipping**

Shipment contents that are non-dutiable are known as document shipments. However, a few countries levy $1 customs value for a document shipment.

For more information, see [Minimum customs value countries](https://developer.fedex.com/api/en-us/guides/api-reference.html#minimumcustomsvaluecountriesorterritories)

_Note: When using FedEx Express International multiple piece shipments (MPS), if one of the package is a document, then all packages in the shipment must be documents. The same rule is applicable for commodity shipments. Commodity and Document packages cannot be shipped together in the same MPS shipment._

**Commodity Shipping**

Shipment contents that are dutiable are known as commodity shipments. When shipping commodities, the entire list of all the commodities in the shipment must be included in the ship request for each package so the commodity values are calculated correctly.

_Note: For FedEx Express International multiple-piece shipments, if one package is a commodity shipment, then all packages in the shipment must contain commodities. Commodity and document shipments cannot be combined in a Multiple-Piece Shipment._

Free Circulation of Goods

The free circulation of goods refers to the unrestricted movement of goods and products within a specific area or region, without any tariffs, quotas, or other trade restrictions. This means that the goods can be transported, bought, and sold freely within that region, without any hinderances.

Free circulation within EU regions: Goods that enter the customs territory of the EU from a non-EU country are referred to as non-commodity goods. Before these goods can be marketed within the EU, they need to be released into free circulation. For this, customs entry should be raised for the goods and a duty and/or VAT should be paid. Once these conditions have been met, the non-commodity goods will become commodity goods. They will get the same status as goods that have been produced, harvested, or mined within the EU and can be transported freely throughout the EU.

Simplified Commodity Shipping

Simplified commodity shipping enables you to ship goods that are in free circulation within European countries by just providing the commodity description instead of providing the complete commodity details in the ship request.  
_Note: To check if your origin/destination pair qualifies for simplified commodity shipping, use the “Retrieve Regulatory Details” endpoint in Global Trade API._

Commodity Description

A common reason for customs delays is an inaccurate or vague shipment description. A commodity description should answer the following questions:

-   What is it?
-   How many are there?
-   What is it made from?
-   What is the intended use?
-   What is the country/territory of manufacture?

Based on the commodity and the services desired, more information may be required. Commodity descriptions for dangerous goods or hazardous materials have very rigorous regulations and prohibitions. If you are shipping a commodity that falls into one of these classifications, be sure to research thoroughly the shipping restrictions for your commodity classification.

_Note: Goods that are in free circulation within European countries, only require the commodity description in the ship request. It does not require the complete commodity detail information such as country of manufacturer, weight, customs value, or customs documents etc. If the other commodity details are specified in the request, then the details will be uploaded but it will not be considered during shipment creation. However, if the customer specifies that the goods are “NOT\_IN\_FREE\_CIRCULATION”, then full commodity details will be required, and complete validation of the commodity details will be performed._

Identifying Restricted Commodities

Commodities that are imported/exported must be identified whether it is a restricted commodity in the shipping destination or from /to the destination the commodity is shipped. If a restricted commodity is shipped then the shipping is immediately stopped and the commodity is caged. The following elements are used to identify and assist you with this information:

-   Commodity Prohibitions – This element provides information on whether the commodity is restricted or not. The commodity’s Harmonized Code is matched with its associated value to determine whether the commodity is prohibited or allowed. The response elements: _derivedHarmonizedCode_, _commodityIndex_, _source_, _categories_, and _type_ indicate the type of commodity and prohibition.
-   Regulatory Reference Data – This element provides information on whether an additional reference data is required for the shipment. The response elements _waivers_, _message, code_, _text_, and such associated elements are displayed.
-   Regulatory Advisories – This element provides any additional information or clarifications regarding the commodity. The response elements advisories lists all the specified advisories. It also displays _code_, _text_, _parameter_ and _localizedText_ as the output.

Commodity Classifications

All commodities imported and/or exported must be properly classified under the Harmonized Tariff System (HTS) codes to meet U.S. and foreign governments' customs requirements. Use the HTS to determine the code for your commodity. The HTS assigns six-digit codes for general categories. Countries that use the HTS are allowed to define commodities at a more detailed level than six digits, but all definitions must correspond to the six-digit HTS system. The U.S. defines commodities using 10-digit HTS codes. For links to the U.S. agencies which administer export and import HTS codes, go to the FedEx International Resource Center on fedex.com.

Commodity Export License

An export license is a specific grant of authority from the government to a particular exporter to export a specific product. Export licenses are granted on a case-by-case basis for either a single transaction or for a specified period of time. The exporter must apply for the export license. This number is one alpha plus six numeric characters. Every license is issued with an expiration date. Commodities requiring a Department of State license ship only by FedEx Express using FedEx International Controlled Export (FICE) service.

When the description of the contents in your international shipment are precise and well-written, the risks of customs delays decrease. Here are a few guidelines for providing detailed descriptions of your goods.

Document or Commodity

-   Begin by determining if what you are shipping is a document or a commodity. Different countries classify documents differently, and therefore, you should understand how a specific country to which you are shipping defines them.
-   In general, a document is a commodity that has no commercial value. It is typically characterized by typed, written or printed matter on paper or another material, and does not require a commercial invoice. If the commodity has commercial value or is part of a commercial business transaction, it is considered a “non-document.” All commodity shipments require a commercial invoice.
-   To research the classification for your commodity, use the FedEx Global Trade Manager online at [fedex.com/gtm](http://www.fedex.com/gtm). You will find country-specific information to determine whether your commodity is considered to be a document or non-document for your destination.

**Customs Clearance**

Each country has specific laws and regulations around international shipping. Many resources are available to help determine document and customs clearance requirements. FedEx provides a commercial invoice, and it is required for all international shipments.

Shipments requiring documentation in addition to the FedEx International Air Waybill and the FedEx International MailService Air Waybill (e.g., a commercial invoice) may require additional transit time.

Air Waybills

Air Waybills are shipping documents, labels, electronic entry or similar item used in the FedEx system for the services described in these terms and conditions. Originals must be used (photocopies are not accepted).

Controlled Commodities  

When shipping the following commodities internationally, check to ensure that they are accepted by your chosen FedEx® service for delivery to the destination country and city:

-   Dangerous Goods in Excepted Quantities
    
    _Note: To ship Dangerous Goods in Excepted Quantities, use the special service option SMALL\_QUANTITY\_EXCEPTION._
    
-   Excepted Package Radioactive

FedEx International Controlled Export (FICE)

FICE provides accurate and compliant customs clearance processing for U.S. and Puerto Rico customers who ship controlled exports. FICE reduces processing times, clearance delays, and exception-handling fees.

Simplified Commodity Shipping within EU

The Customer needs to identify if the Commodity is in free circulation or not. If a commodity is identified as ‘Not in Free Circulation’ then the complete commodity information needs to be specified in the API request. All shipments from Northern Ireland (GB) to EU & from EU to Northern Ireland (GB) are NOT Intra-EU and the Commodity relaxation rules for Intra-EU shipments will not apply. However, all shipments from Republic of Ireland (IE) to EU & from EU to Republic of Ireland (IE) are Intra-EU and the Commodity relaxation rules for Intra-EU shipments will apply.

International Traffic in Arms Regulations (ITAR)

ITAR is a set of U.S. government regulations that control the global movement of defense-related items on the U.S. Munitions List (USML). FedEx allows ITAR shipping with FedEx International Priority (IP), FedEx International Premium (IP1), and FedEx International Airport-to-Airport (ATA) services.

**Country-Specific Clearance and Shipping Rules**

The following are some of  the countries specific to custom clearance requirements. The requirements may vary based on country. For more information, visit fedex.com or contact your FedEx account executive.

United Kingdom/Ireland and Europe Customs and Shipping Rules:

Following are the shipping rules associated with United Kingdom/Ireland and Europe.

  **Shipping Origin & Destination**

 **Clearance & Shipping Rules** 

 Northern Ireland (GB) to UK Mainland (GB) 

 No Clearance Required (Domestic Shipments).

 UK Mainland (GB) to Northern Ireland (GB) 

 Clearance Required (Customs declaration document).

 EU to EU

 Free circulation of goods. Simplified commodity shipping is available.

 Republic of Ireland (IE) to EU

 Free circulation of goods. Simplified commodity shipping is available.

 EU to Republic of Ireland (IE)

 Free circulation of goods. Simplified commodity shipping is available.

 Northern Ireland (GB) to Republic of Ireland (IE)

 Clearance Required (Customs declaration document).

 Northern Ireland (GB) to EU 

 Clearance Required (Customs declaration document).

 EU to Northern Ireland (GB)  

  Clearance Required (Customs declaration document).

 Northern Ireland (GB) to Rest of the World & Rest of the World to Northern Ireland (GB)

 Clearance required.

 UK to EU or EU to UK 

 Clearance Required.

 Shipping Services can be used to ship to Northern Ireland from other countries

-   FedEx International Priority® (IP) - For delivery within 1, 2, or 3 business days.
-   FedEx International Economy® (IE) - For delivery within 2–5 business days.
-   FedEx Regional Economy®.
-   FedEx International Connect Plus®.

  UK Mainland (GB) to GB Channel Islands (GB).

  Description and Value must be provided in the request. A copy of Airway Bill and two copies of Commercial Invoice or Proforma Invoice are generated for this shipment.

  Channel Islands (GB) to UK Mainland (GB)

  Description and Value must be provided in the request. A copy of Airway Bill and two copies of Commercial Invoice or Proforma Invoice are generated for this shipment.

United Kingdom International Priority Distribution (IPD) rules

-   The rules are applicable to customers shipping from UK to EU.
-   Northern Ireland maintains an open border with the Republic of Ireland, which is part of European Union (EU). Hence, IPD shipments to EU (SPOC) can include packages to Northern Ireland.

Australia Customs Clearance

-   General clearance requirement
-   Formal entry requirement
-   Prohibited items
-   Clearance tips
-   Bonded transfers
-   Import duty and GST

China Customs Clearance

-   Declaration categories
-   Prohibited items
-   Required documents
-   Clearance tips
-   Import duties and taxes
-   Free trade zones and export processing zones
-   Bonded transfers

China Export Customs Clearance

-   Required documents
-   Tips for smooth clearance

Hong Kong Customs Clearance

-   Declaration categories
-   Prohibited items
-   Required documents
-   Clearance tips
-   Bonded transfers
-   Import duties and taxes

India Export Customs Clearance

-   General clearance documents
-   Courier clearance
-   Formal clearance

Indonesia Customs Clearance

-   Declaration categories
-   Prohibited items
-   Clearance tips

Japan Customs Clearance

-   Declaration categories
-   Clearance requirements
-   Prohibited items
-   Required documents
-   Clearance tips
-   Bonded transfers
-   Free trade zones
-   Import duties and taxes

Malaysia Customs Clearance

-   Declaration categories
-   Free commercial zone (FCZ) declaration charge
-   Prohibited items
-   Required document
-   Import duties and taxes

New Zealand Customs Clearance

-   Declaration categories
-   Commodity specific requirements
-   Prohibited items
-   Importer requirement
-   Bonded Transfers
-   Import duties and taxes

Philippine Customs Clearance

-   Declaration categories
-   Prohibited items
-   Required document
-   Ancillary charges
-   Import duties and taxes

Singapore Customs Clearance

-   Declaration types
-   Prohibited items
-   Required document
-   Import duties and taxes
-   Duties and taxes payment options
-   Free trade zones (FTZs)
-   Regulatory agencies and importer resources

South Korea Customs Clearance

-   Declaration categories and required document
-   Prohibited items
-   Bonded transfers
-   Import duties and taxes

Taiwan Customs Clearance

-   Declaration categories
-   Prohibited items
-   Required documents
-   Import duties and taxes
-   Economic and free trade zone (FTZ) information
-   Warehouse specifications

Thailand Customs Clearance

-   Declaration categories
-   Prohibited items
-   Food and drug administration commodities
-   Required documents
-   Import duties and taxes
-   Ancillary charges and other fees
-   Free trade zones (FTZs)

Vietnam Customs Clearance

-   Declaration categories
-   Prohibited items
-   Required documents
-   Commodity specific requirements
-   Warehouse and customs fees
-   Import duties and taxes

**Shipping and Customs Documents**

Accurate documentation is an important part of domestic as well as international shipping in order to avoid package caging or delays an ensure smooth package delivery. Following are different types of shipping and customs documents.

Certificate of Origin (COO)

A COO is an international document that verifies the country/territory where a product was manufactured. Some countries restrict imports from certain countries, many countries limit the quantity of imported goods, and some countries give preference to goods manufactured in a certain country.\[Service ENUM : CERTIFICATE\_OF\_ORIGIN\]

Commercial Invoice (CI)

This is a document provided by the seller/exporter that describes the parties involved in the shipping transaction and the goods being transported. It is the primary document used by Customs. It should be prepared using the official language of the country/territory to which the goods are being exported, if possible. The Commercial Invoice should include a detailed breakdown of all items included in the shipment, including: a proper description of the goods (what is it? what is it made from? what is its intended use?) the quantity, the country/territory of manufacture, the price or cost, currency used, the Harmonized System number for each commodity and the terms of delivery. Some countries require that an original invoice be executed on the shipper's letterhead. The invoice should always be signed and dated by the exporter validateing that the details provided are true and correct representations of the contents covered by the Commercial Invoice. \[Service ENUM : COMMERCIAL\_INVOICE\]  
For more information visit our [Global Trade Manager](https://www.fedex.com/GTM).

Custom Package Document

This document enables you to add any additional details about the contents of the package. \[Service ENUM : CUSTOM\_PACKAGE\_DOCUMENT\]

Custom Shipment Document

You can add additional details about the shipment in this document. \[Service ENUM : CUSTOM\_SHIPMENT\_DOCUMENT\]

Customer Specified Labels

This document enables you to add customized labels on the package. \[Service ENUM : CUSTOMER\_SPECIFIED\_LABELS\]

Dangerous Goods Shipper Declaration

This is shippers declaration for dangerous goods, containing nature and quantity of the goods with signed declaration. \[Service ENUM : DANGEROUS\_GOODS\_SHIPPERS\_DECLARATION\]

Export Declaration

The Electronic Export Information (EEI) formerly known as Shipper's Export Declaration (SED) is required by the US Department of Census in order to obtain statistical data and by the Bureau of Industry and Security (BIS) to assist in enforcing export controls. The SED/EEI is required when the total value of goods classified under any single Schedule B number exceeds $2,500 (USD) or the commodity(s) require an export license. This information can be completed electronically by the exporter or their agent. The information is mandatory required to be submitted electronically through the Automated Export System (AES) for commodities listed on the Commerce Control List (CCL) or the U.S. Munitions List (USML). \[Service ENUM : EXPORT\_DECLARATION\]

General Agency Agreement

An Agency Agreement or Power of Attorney (POA) is the legal authority that is provided by importers to a customs broker to allow them to release and/or account for shipments with the Canada Revenue Agency (CRA) on behalf of the importer's company. If a Canadian Resident Importer would like Federal Express to act as their customs broker in Canada on an ongoing basis, these forms must be completed and returned as per the instruction sheet before shipping into Canada. This form is a Limited Agency Agreement and would apply to Federal Express shipments only. This form is in a fillable format for easy use in the document library section on this website. \[Service ENUM : GENERAL\_AGENCY\_AGREEMENT\]

LABEL

This is Shipment label generated in the Shipment with ETD special service with Post-Shipment document upload criteria. This label can also be uploaded with the shipment along with other paperwork. \[Service ENUM : LABEL\]

Net Rate Sheet

It’s an account-specific rate sheet that reflect transportation charges minus applicable discounts. These are downloadable on FedEx site for various available services and generate a table of rates across applicable zones and weights. These downloadable reports are stored for your convenience and may be retrieved as you need them. These rate quotes are provided as a courtesy and are not legally binding, nor are they intended to be an agreement or part of an agreement. Net rates are calculated based on applicable transportation discounts and do not include: surcharges, ancillary / other charges, duties and taxes, or special handling fees. \[Service ENUM : NET\_RATE\_SHEET\]

OP900

This is FedEx Ground Hazardous material declaration form. \[Service ENUM : OP\_900\]

Pending Shipment Email Notification

Document to receive email notifications for pending shipments. \[Service ENUM: PENDING\_SHIPMENT\_EMAIL\_NOTIFICATION\]

Pro Forma Invoice

The pro forma invoice is issued before sales takes place. Once receiving pro forma invoice from the supplier, the buyer sends a purchase order or opens a letter of credit to the supplier. As per agreed date of shipment, the seller arranges to ship the goods. \[Service ENUM: PRO\_FORMA\_INVOICE\]

Return Instructions

This is the return Label. \[Service ENUM: RETURN\_INSTRUCTIONS\]

VICS Bill of Lading

VICS Bill of Lading form is created by the VICS (Voluntary Inter-Industry Commerce Standards) and is primarily used for general merchandise retail industry shipments. \[Service ENUM: VICS\_BILL\_OF\_LADING\]

USMCA Commercial Invoice and Validation of Origin

The USMCA/T-MEC/CUSMA Commercial Invoice-Validation of Origin is a commercial invoice combined with the required validation of origin data elements including the statement that will provide a way to both ship and claim preferential tariff treatment for qualifying goods using one document for the United States-Mexico-Canada agreement. Goods that qualify for the preferential tariff treatment must originate and be exported from the U.S., Mexico or Canada. \[Service ENUM: USMCA\_COMMERCIAL\_INVOICE\_VALIDATION\_OF\_ORIGIN\]

USMCA Validation of Origin

The USMCA/T-MEC/CUSMA Validation of Origin is a form used to claim the preferential tariff treatment for the United States-Mexico-Canada Agreement. The validation contains a set of data elements including a statement and must be validated by the exporter, producer or importer for qualifying goods. The imported goods must originate and be exported from the U.S., Mexico or Canada. This form can be used to cover a single shipment or for a 'blanket' period of up twelve months. \[Service ENUM: USMCA\_VALIDATION\_OF\_ORIGIN\]

Other

The following section describes some of the common documents which are classified under other documents. These documents are not mandatory to be uploaded for a shipment, but may be required for customs clearance of your individual shipment. This may vary based on the type of shipment, origin, destination and other factors. \[Service ENUM: OTHER\]

-   **Packing List**
    

A Packing List is required if there is more than one package under one air waybill or if the shipment weighs more than 100kgs. Please note that this requirement may differ between markets based on the commodities being shipped. The list must correctly and clearly describe the goods, quantity and weight.

-   **FCC 740 Statement** Regarding the Importation of Radio Frequency Devices Capable of Causing Harmful Interference

The Federal Communications Commission (FCC) 740 form is required while shipping electronics with radio frequency devices which are capable of causing harmful interference. The form involves details such as Device Model/Type Name, Harmonized Tariff Number, Manufacturer's Name and Address, Consignee's Name and Address and Importer's Name and Address.

-   **Video-Film Declaration**
    

The video film declaration: This document is submitted to declare that the film/video that is shipped contains no obscene or immoral matter, nor any matter advocating or insurrection against the United States. The document involves details such as Length of Film/Video, Duration of Film/Video and Brief Synopsis of Content.

_Disclaimer: Above information subjected to change._

_Note: The Other documents are only uploaded based on countries, products and other special custom document. To view a list of many other commonly used documents click [Export Documents](https://developer.fedex.com/api/en-us/guides/api-reference.html#exportdocuments)_

**Other Customs and Regulatory Solutions**

Canada Customs and Regulatory Solutions

The Resolutions team provides Canadian Sales and customers with regulatory information and support for FedEx Express international shipments only.

Customs Bond for FedEx Express Imports

FedEx Express has appointed FedEx Trade Networks (FTN) to act as customs broker for import shipments to the U.S., unless otherwise specified. FTN serves as the importer of record (IOR) for customs purposes for the vast majority of Express import shipments; however, this role can be served by customers if preferred.

Declared Value (DV) Exception for Non-Jewelry Items

FedEx provides a permanent authorization (also known as a high declared value \[HDV\] exception request) for qualified customers to ship non-jewelry items valued in excess of the U.S.$50K limit specified in the FedEx Service Guide.

FedEx International Shipping Assist (FISA)

FISA is a free service targeting small and medium businesses and individuals who are new to or inexperienced with shipping internationally.

Global Trade Agreements and Trade Legislation

Businesses of all sizes benefit from global trade. U.S. Free Trade Agreements (FTAs) facilitate global trade, open foreign markets to U.S. exporters, and ensure partner countries follow common rules and standards. FTAs create a stable and transparent trading environment, making it easier for U.S. companies to export their products and services worldwide.

One-Time Declared Value (DV) Exception

Shippers who need a one-time increase in the standard DV limit for a U.S. domestic or U.S. export international Express shipment to a maximum of USD$250K can request a DV carriage increase, also known as a _domestic waiver_ request.

Shipper's Letter of Instruction (SLI)

An SLI captures international shipment information for U.S. customers.

_Note:_

_-   Customs clearance is included for shipments to Canada through our brokerage-inclusive service, a fee applies. Brokerage-inclusive service may not be available with all electronic shipping solutions.
-   International Ground parcel distribution service allows FedEx Ground to consolidate International Ground shipments into one unit that is cleared and handled as one customs entry with a single broker entry fee._

### Domestic Shipping

This allows customers to ship domestically. Not all services are available in all the areas. Domestic shipping within many European Countries and Mexico requires specific account number for each country.

**FedEx Domestic Services**

The following information gives an overview of the services that are available for Domestic shipping. Not all services are available in all areas.

FedEx Economy®

FedEx Economy® provides delivery in 3 business days to businesses by 5 p.m. and to residences by 7 p.m. \[Service ENUM : FEDEX\_ECONOMY\]

FedEx First Overnight®

FedEx First Overnight® provides next business day delivery by 8 a.m., 8:30 a.m., 9 a.m. or 9:30 a.m. to most areas and by 10 a.m., 11 a.m. or 2 p.m. to extended areas. \[Service ENUM : FIRST\_OVERNIGHT\]

FedEx Priority Overnight®

FedEx Priority Overnight® provides next business day delivery by 10:30 a.m. to most U.S. addresses, by noon, 5 p.m. Deliveries are also made on Saturdays by noon, 1:30 p.m. or 5 p.m.

Service days are Monday through Friday, with Saturday pickup and delivery available in many areas for an additional charge. \[Service ENUM : FEDEX\_PRIORITY\_OVERNIGHT\]

FedEx Standard Overnight®

FedEx Standard Overnight® provides next business day delivery by 3 p.m. to most addresses; by 5 p.m. and by 8 p.m. to residences. Service days are Monday through Friday with Saturday pickup available for an extra charge. \[Service ENUM : STANDARD\_OVERNIGHT\]

FedEx Ground

Delivers Monday through Friday (8 a.m. to close of business day), based on distance to the destination.

The day-definite delivery is within the United States and Canada only. \[Service ENUM : FEDEX\_GROUND\]

FedEx Home Delivery®

FedEx Home Delivery for residential delivery via [FedEx Ground](https://www.fedex.com/en-us/shipping/ground.html) in 1−7 business days, based on distance to the destination. \[Service ENUM : GROUND\_HOME\_DELIVERY\]

FedEx Express Saver®

FedEx Express Saver® provides third business day delivery by 5 p.m. and to residences by 8 p.m.

Service days are Monday through Friday, with Saturday pickup and delivery available in many areas for an additional charge. \[Service ENUM : FEDEX\_EXPRESS\_SAVER\]

FedEx SameDay® City

FedEx SameDay® City service provides cross-city delivery within hours in select cities and postal codes. Pickups and deliveries can be made Monday through Friday. Use the SAME\_DAY\_CITY element to identify this service type when shipping a package. A contract is required to use FedEx SameDay City service. See your FedEx Account Executive for more information about SameDay City. \[Service ENUM : SAME\_DAY\_CITY\]

_Note: Manual air waybills are not available with SameDay City service. This service is only available for selected cities in Mexico. This is not the U.S. domestic FedEx SameDay service._

FedEx One Rate®

FedEx One Rate® is flat-rate shipping that does not require you to weigh or measure shipments under 50 lbs. and declared value is $100, that includes fuel, residential, and delivery area surcharges. You can choose the box or tube that best fits the size of what they need to ship and fill the package to capacity, as long as the shipment does not exceed 50 pounds. Payment options for this service include Shipper, Recipient and Select Third Parties. FedEx Express® delivery in 2 or 3 business days, Saturday delivery is available in some areas. Free route pickup or drop off at 62,000 convenient locations. \[Service ENUM : FEDEX\_ONE\_RATE\]

**Europe Domestic Services**

FedEx® First

FedEx® First is a parcel service and provides next business day delivery by 9 a.m., 9:30 a.m. or 10 a.m. to business or residential addresses. \[Service ENUM : FIRST\_FIRST\]

FedEx® Priority Express

FedEx® Priority Express is a parcel service and provides next business day delivery by noon to business and residential addresses. \[Service ENUM : FEDEX\_PRIORITY\_EXPRESS\]

FedEx® Priority

FedEx® Priority is a parcel service and provides end of day delivery service to business or residential addresses. \[Service ENUM : FEDEX\_PRIORITY\]

FedEx® Priority Express Freight

FedEx® Priority Express Freight provides next business day delivery by noon to business or residential addresses. \[Service ENUM : FEDEX\_PRIORITY\_EXPRESS\_FREIGHT\]

FedEx® Priority Freight

FedEx® Priority Freight provides end of day delivery service to business and residential addresses. \[Service ENUM : FEDEX\_PRIORITY\_FREIGHT\]

FedEx® Economy

FedEx® Economy provides end of day delivery service for packages up to 68 kgs in 2 to 3 business days. \[Service ENUM : FEDEX\_ECONOMY\_SELECT\]

For more information on the service areas for Domestic shipping, see [Europe Domestic Services Portfolio.](https://developer.fedex.com/api/en-us/guides/api-reference.html#europenewdomesticservicesportfolio)

### FedEx Ground® Economy (Formerly known as FedEx SmartPost®)

FedEx Ground® Economy and FedEx Ground® Economy Returns each require a service contract. To sign up for FedEx Ground® Economy outbound shipping or FedEx Ground® Economy Returns, contact your FedEx account executive.

FedEx Ground® Economy helps you consolidate and deliver high volumes of low-weight, non-time-critical business to consumer packages using the United States Postal Service (USPS) for final delivery to residences. This service provides delivery Monday through Saturday to all residential addresses in the U.S., including P.O. boxes and military APO and FPO destinations.

FedEx Ground® Economy also offers FedEx Ground® Economy Returns service, delivery and shipment email notifications for U.S. outbound shipments, customizable labels, and Future Day shipping.

FedEx Ground® Economy Service Details

FedEx Ground® Economy Service includes the following features:

-   FedEx Ground® Economy is available for shipments originating in the 48 contiguous United States only. Alaska, Hawaii, Puerto Rico, and the U.S. territories are not included as origin points.
-   The FedEx Ground® Economy service allows delivery to all 50 American States and territories, including PO boxes and military locations (Army Post office – APO, Fleet Post Office – FPO, Diplomatic Post Office – DPO), and Puerto Rico.
-   FedEx Ground® Economy supports customer packaging only. Because FedEx Ground® Economy employs the USPS for final delivery to residences, packages are subject to USPS restrictions.
-   Future Day shipping is available for FedEx Ground® Economy shipments.
-   Saturday delivery is possible by USPS. No FedEx surcharge applies in this case.
-   FedEx Ground® Economy shipment labels include a 12-digit FedEx master tracking number with a 34 digit FedEx barcode string, a USPS tracking number with barcode string and an optional customer reference barcode. Packages can only be tracked using the FedEx tracking Number or USPS tracking number.
-   Eligible payment types are Bill Sender and Bill Recipient.
-   FedEx Ground® Economy Returns provides a U.S. to U.S. returns service for all shippers with more than 100 returns a day. Once contracted, a shipper can use any service for their outbound shipping and still use FedEx Ground® Economy Returns. Both print and email return label options are available.
-   FedEx Ground® Economy does not pick up packages originating outside of the contiguous U.S.

_Note: A separate account number is given for FedEx Ground® Economy outbound shipments and FedEx Ground® Economy Returns. If a customer is contracted with return services, they need to use the associate account rollup to a national number._

_For Standard Mail, Bound Printed Matter, and Media the following dimensions restrictions apply:_

-   _Dimensions: No more than 84' in combined length and girth (L+2W+2H)._
-   _No one dimension greater than 60'._
-   _Minimum dimensions are 6'' L x 4'' W x 1'' H._

_For Parcel Select the following restrictions apply:_

-   _Dimensions: No more than 130'' in combined length and girth._
-   _No one dimension can be greater than 60'._
-   _Minimum Dimensions are 6'' L X 4'' W X 1'' H._
-   _If a weight less than one lb. is entered for Bound Printed Matter or Media, it is automatically rounded up to one lb._

FedEx Ground® Economy label details

-   FedEx Ground® Economy(FGE) shipment labels include a 12-digit FedEx master tracking number with a 34-digit FedEx barcode string, a USPS tracking number with barcode string and an optional customer reference barcode. Following are the benefits of this update:
    -   The FedEx tracking number allows you to search for tracking details, hence addressing your package tracking queries.
    -   This improves the ease of identification of FedEx Shipment.
-   When you enter customer references for an FGE shipment, the label will include a customer reference barcode with up to 24 characters. Other FedEx systems will continue to allow 40 characters.
-   If you issue or create custom notifications, it is advised to use the FedEx tracking number to direct inquiries to fedex.com.

The following image provides you with an insight into the content of the updated FedEx Ground Economy label.

![FGE label update.png](/api/content/dam/fedex-com/irc/businessdocimages/FGE%20label%20update.png)

Explore our JSON API collection to see how we can deliver on your business needs. Test your integration with these sample requests.

[Learn more about sandbox virtualization guide](https://developer.fedex.com/api/en-us/guides/sandboxvirtualization.html)

FedEx Ground® Economy Service Options

The different service options for FedEx Ground® Economy based on package weight and dimensions:

**Service Option**

**Minimum Weight**

**Maximum Weight**

**Dimensions**

Parcel Select Lightweight

0.01 Pounds

< 1 Pound

Sum of length plus girth cannot exceed 84″

Minimum: 6″ (L) x 4″ (W) x 1″ (H)

Bound Printed Matter

0.01 Pounds

15 Pounds

Sum of length plus girth cannot exceed 84″

Minimum: 6″ (L) x 4″ (W) x 1″ (H)

Media

0.01 Pounds

70 Pounds

Sum of length plus girth cannot exceed 84″

Minimum: 6″ (L) x 4″ (W) x 1″ (H)

Parcel Select

1 Pound

70 Pounds

Sum of length plus girth cannot exceed 130″

Minimum: 6″ (L) x 4″ (W) x 1″ (H)

FedEx Ground® Economy Returns

0.01 Pounds

70 Pounds

Sum of length plus girth cannot exceed 130″

Minimum: 6″ (L) x 4″ (W) x 1″ (H)

Exceptions

The following are not available for FedEx Ground® Economy:

-   Collect on delivery
-   Money-back guarantee
-   Declared value
-   Signature Proof of Delivery
-   Evening or appointment delivery
-   Hazardous materials service

### Unauthorized Surcharge

FedEx is introducing new unauthorized surcharges for packages that exceed the maximum allowed dimensions. Two new charges will apply to international and intra-country express parcel or express freight units that exceed maximum dimension or weight limits of our network. **Additional information provided in your local ‘Service Guide’.**

This surcharge supports more efficient handling of oversized packages within the FedEx network and helps offset the additional handling costs associated with larger-than-limit shipments. It applies where a package exceeds the dimension restrictions for the destination country, with each country setting its own limits. Charges are assessed on a per-package basis.

### Special Services

**Alcohol Shipment**  

FedEx alcohol shipping requirements apply to wine, liquor, and beer. Each type is listed separately when regulations differ by beverage type. Wine is the only alcohol type that can be shipped directly to consumers, depending on selected shipping service. Alcohol may be Express Dangerous Goods (DG), depending on the percentage of alcohol per volume.

Who Can Ship?  

-   Individuals cannot ship alcohol via FedEx.
-   Businesses that hold licenses (licensees) and are enrolled in the FedEx alcohol shipping program can ship to individuals in select states or to licensees in other states or countries.
-   Some states have strict regulations for shipping wine to consumers, and some do not allow it.

International Regulations

-   Individual country laws govern international alcohol shipping. Customers must comply with origin and destination countries' laws and regulations.
-   FedEx does not accept international Ground shipments containing alcohol.

**Monitoring and Intervention (MI) and Healthcare Identifiers (HCID)**

Monitoring and intervention (MI) and HealthCare Identifier (HCID) special service options help proactively monitor critical healthcare shipments, mitigate risk, and provide intervention support to protect healthcare shipments. The HCID special services identifies time sensitive healthcare shipments and facilitates their prioritization in the FedEx network. Integration with MI provides close monitoring of HCID shipments to allow you to track your package in real time.

_Note:_

-   _This is an add-on service, you must contact your FedEx customer representative to enable it for your account._
-   _To select the MI and HCID services for the shipments, an account must be enabled with the healthcare feature._
-   _To select the non-healthcare service options such as Aerospace or Automotive Critical, the EAN must be enabled for each individual option._
-   _Healthcare Options are only valid for Express Premium Services. You must choose M&I special service option first to ship these health care options._
-   _Certain surcharges are also applicable for these special service types._

To know about the available MI and HCID service options, refer to the [MI and HCID options](https://developer.fedex.com/api/en-us/guides/api-reference.html#monitoringandinterventionoptions) table. The chosen MI and HCID codes will be printed on the shipping labels.

_Note:_

-   _While shipments can contain multiple healthcare identifiers, labels will only display a single HCID. If multiple identifiers are included in a shipment, labels will display the identifier that is highest on the HCID options list._
-   _The Temperature Controlled identifier (HCT - TEMPERATURE\_CONTROLLED) requires the selection of a temperature range identifier. Only a single temperature can be selected for a shipment. If a shipment is created with more than one temperature-related HCID, it will result in an error._

**Dangerous Goods by Road**

The Dangerous Goods (DG) by road is a package level special service option that allows shippers to ship their dangerous goods packages via road as per ADR regulations within Europe. The option to ship Dry Ice, Lithium Batteries, Limited Quantity Dangerous Goods, etc., for intra-country shipping through FedEx Regional Economy, FedEx Regional Economy Freight, and FedEx Express Domestics, etc. will be available for the DG by road service within key European markets

Below special services are included to enable additional shipment capabilities for DG by road:

-   Standalone Lithium battery shipments
-   Fully Regulated DG by Road
-   Limited Quantity Shipments by Road
-   Genetically Modified (Micro) Organisms
-   Biological Substances Category B
-   Excepted Quantities
-   Radioactive Materials

_Note:_

-   _The enum STANDALONE\_BATTERY must be specified under **specialServiceTypes** to get the option to select the battery details under the element **standaloneBatteryDetails**. This special service type is applicable only for Intra-European regions._
-   _For Fully Regulated Dangerous Goods (FDG) and Limited Quantities Dangerous Goods (LDG) shipments, you need to specify the **regulation** as ADR under **dangerousGoodsDetail** object in the request for the shipment to be processed successfully._

**Dangerous Goods**

Shipments with dangerous goods must be tendered to FedEx Express in accordance with current International Air Transport Association (IATA) regulations for air transport and the FedEx Express Terms and Conditions. This is required regardless of the routing and whether the shipment ends up physically moving by air transportation, ground transportation or a combination of these. For added confidence, use a FedEx® DG Ready solution to generate your dangerous goods declaration. \[Service ENUM : DANGEROUS\_GOODS\]

Division 1.3 Explosives

FedEx Express does not transport Division 1.3 explosives. Division 1.3 explosives are prohibited for all FedEx Express® services.  

Dry ice

You can ship packages containing dry ice, as long as the specifics for the dry ice shipment are included in the shipping transaction. Dry ice is considered a Dangerous Goods material. \[Service ENUM : DRY\_ICE\]

_Note:_

_-   Dry Ice is a Package level special service for Domestic and International shipments.
-   Dry Ice must be declared at both Shipment and Package level for International MPS shipments to print the compliance statement on Airway Bill labels. Example: Dry Ice, UN1845 1x2.00 KG.
-   Dry Ice Special service is not allowed for Document shipment.
-   FedEx Packaging is not allowed._

Radioactive materials

Within the U.S., Highway Route Controlled Quantity or Fissile Class III radioactive materials will not be accepted for carriage without advance arrangements.

Cargo Aircraft Only

The Cargo Aircraft Only service is used for packages containing dangerous goods in quantities not permitted on passenger aircraft. The customer will be able to indicate whether the shipment is suitable for cargo aircraft. The DGD-CAO identifier is added in AWB for cargo aircraft shipments. The Cargo Aircraft Only label (DGD-CAO) warn airline ground operation personnel not to load dangerous cargo on the passenger aircraft due to the danger which may pose to the safety of the aircraft and its passengers. Few examples of dangerous goods for Cargo Aircraft service are Lithium Batteries, Magnetized material, battery powered equipments, Dry Ice (Carbon Dioxide, Solid).

Lithium Batteries

Lithium batteries and cells are classified as Dangerous Goods due to their potentially vulnerable nature under certain circumstances which might lead to fire accident. Hence, the International Air Transport Association (IATA) and International Civil Aviation Organization (ICAO) have framed certain guidelines to be followed while shipping Lithium batteries and cells by air:

The steps to ship lithium ion battery / cell are:  
**Step 1**. Determine which type of battery you are shipping  
**Step 2**. Determine the proper way to prepare your lithium battery shipment  
**Step 3**. Complete the Paperwork  
**Step 4**. Complete the Package  
For detailed guidance and step by step instructions, [check here.](https://www.fedex.com/content/dam/fedex/us-united-states/logistics/Lithium-Battery-Shipping-Tool.pdf)

Packages containing smaller quantities or lower watt hours of lithium are subject to less stringent regulatory requirements. To better identify and control shipments, you need to identify and declare the technical specifications of the shipment. For information on how to ship these batteries and cells [click here.](https://www.fedex.com/en-us/shipping/how-to-ship-batteries.html#3)  
[Click here](https://www.fedex.com/content/dam/fedex/us-united-states/services/LithiumBattery_Overview_2022.pdf) to refer to FedEx-provided job aid to quickly determine which type of Lithium Battery shipment you are going to make.

There are four types of Lithium Battery shipments which can be transported via air under simplified conditions without a DG Shipper’s Declaration:

-   Lithium Ion Batteries Packed With Equipment UN 3481, Section II, PI 966
-   Lithium Ion Batteries Contained in Equipment UN 3481,Section II, PI 967
-   Lithium Metal Batteries Packed With Equipment UN 3091,Section II, PI 969
-   Lithium Metal Batteries Contained in Equipment UN 3091, Section II, PI 970

For these four types, the simplified Lithium Battery declaration through the Array of Objects element “batteryDetails” that is found in “packageSpecialServices”is needed. The Special Service Type “Battery” also needs to be provided. This type of Lithium Battery shipment will be identifiable on the FedEx shipping labels through the “ELB” Handling code. The ICAO/IATA requirements, especially for labeling and packaging, continue to apply. For other LB shipping types commonly a full DG Declaration (Shipper’s declaration) is required, see [How to Ship Dangerous Goods](https://www.fedex.com/en-us/service-guide/dangerous-goods/how-to-ship.html#lithium-batteries-dangerous-goods).

To create and validate a shipment request and to create a shipment tag, you are required to select LITHIUM\_ION / LITHIUM\_METAL ENUM as an input for batteryMaterialType in batteryDetails. The batteryMaterialType indicates the material composition of the battery or cell.  

_Note: The above mentioned information is applicable only on the four ELB sections described above and not to Lithium Battery shipments with a shipper’s declaration (DGD)._

The Lithium Battery Service applies to the following FedEx Express services mentioned in the table:

FedEx Domestic Services

FedEx International Services

FedEx First Overnight®

FedEx International First Overnight

FedEx Priority Overnight®

International Priority (IP)

FedEx Standard Overnight®

FedEx International Priority®

FedEx 2 Day®

FedEx® Regional Economy

FedEx Express Saver®

FedEx® Regional Economy Freight

FedEx 1 Day® Freight (Express)

FedEx International Priority® Express

FedEx 2 Day® Freight (Express)

FedEx International Priority Overnight

FedEx 3 Day® Freight (Express)

FedEx International Economy®

FedEx® First

FedEx International Connect Plus (FICP)

FedEx® Priority Express

International Priority® Freight Service

FedEx® Priority

FedEx International Economy® Freight Service

FedEx® Priority Express Freight

FedEx Europe First®

FedEx® Priority Freight

FedEx First Overnight® Freight

FedEx® Economy

FedEx 2Day® AM

FedEx International Priority DirectDistribution Freight (IDF)

FedEx International Priority DirectDistribution (IPD)

FedEx International Economy DirectDistribution (IED)

FedEx Transborder Distribution Canada (TD CA) – Express

FedEx Transborder Distribution Mexico (TD MX) – Express

Special handling fees  

There are special handling fees that apply to shipments containing dangerous goods. Surcharges are based on classification and type of special handling required, including whether the items need to be accessible during shipment.

Delivery Signature Options

Shippers can choose from four FedEx® Delivery Signature Options for FedEx Express® and FedEx Ground® shipments.

**Signature Option**

**Service Description**

Direct Signature Required

Any person at the recipient’s address may sign for delivery. If no one is at the address, FedEx will reattempt delivery.

Indirect Signature Required

This option is available for residential deliveries.  
FedEx obtains a signature in one of three ways:

-   From someone at the delivery address.
-   From a neighbor, building manager or other person at a neighboring address.
-   The recipient can authorize release of the package without anyone present.

Adult Signature Required

FedEx will obtain a signature from someone at the delivery address who is at least the age of majority in the destination country.

No signature Required

FedEx may release the package without anyone present.

Delivery Signature Options Details  

-   Once a shipment has been given to FedEx, you may not change the signature option.
-   Direct Signature Required service is not available for Hold at Location.
-   Adult Signature Required service is available for Hold at Location.
-   All packages in a multiple-piece shipment must have the same FedEx Delivery Signature Option.
-   All pieces with a declared value of $500USD or $500CAD or greater require a signature. Direct Signature Required service is the default service and is provided at no additional cost. If you are shipping a multiple-piece shipment and one or more packages has a declared value of $500USD/CAD or greater, process the package with the lowest value first to avoid multiple delivery charges.

**FedEx Priority Alert Options**

FedEx Priority Alert™

This comes with a promise of proactive monitoring and 24-hour connectivity, so you know where your shipment is every step of the way. Dedicated support from FedEx means security for you when it matters most. \[Service ENUM : PRIORITY\_ALERT\]

FedEx Priority Alert Plus™

This comes with an even higher guarantee – proactive defense. In the unlikely case of a delay, your critical, temperature-sensitive shipment (typically healthcare-related) will get the necessary intervention, such as dry ice replenishment, gel pack reconditioning and access to cold storage. FedEx understands the on-time delivery of critical shipments can save lives. FedEx offers added assurance that your urgent package will be closely watched from the time of departure until it's safely delivered.

Pink means priority: Priority Alert packages come equipped with bright pink tape around the package, signaling their priority status when it comes to loading and unloading.

FedEx Priority Alert™ and FedEx Priority Alert Plus™ are specialized contract-only, fee-based services that combine 24/7 support, advanced shipment monitoring, proactive notification and customized package recovery for critical and time-sensitive shipments. Shipments receive priority boarding and priority clearance handling. For ease of visibility, all FedEx Priority Alert™ information is printed on the FedEx ASTRA label. A per package surcharge is associated with FedEx Priority Alert™ service. \[Service ENUM : PRIORITY\_ALERT\_PLUS\]

FedEx Priority Alert Plus™ includes all the FedEx Priority Alert™ features of the highest level of advanced monitoring for time- and temperature- sensitive shipments catering to the financial, aerospace, electronics manufacturing and healthcare industries, plus these options:

-   Dry Ice Replenishment
-   Gel Pack Replacement
-   Cold Storage

As with FedEx Priority Alert™, a surcharge is associated with this special service.

FedEx Priority Alert Service

The FedEx Priority Alert and Priority Alert Plus services are supported as an option for the following shipment services:

-   FedEx First Overnight®
-   FedEx Priority Overnight®
-   FedEx International Priority®
-   FedEx International First®
-   FedEx Europe First®
-   FedEx® First
-   FedEx® Priority Express
-   FedEx® Priority
-   FedEx® Priority Express Freight
-   FedEx® Priority Freight
-   FedEx® Economy

Shipment Special Services include:

-   Saturday Delivery
-   Weekday Delivery
-   Hold at Location

Package Special Services includes:

-   Dangerous Goods
-   Dry Ice
-   Signature Service Option

**Saturday Service**

Saturday pickup or Saturday delivery services for FedEx Express® shipments for an additional surcharge is available. A fee applies to all regular stop and on-call pickups and deliveries. Package delivery or pickup on a Saturday is available in most U.S. cities and in select international locations.

Saturday Ship and Delivery Services

Saturday delivery is available for the following FedEx Express U.S. service types:

-   FedEx Priority Overnight®
-   FedEx 2Day®
-   FedEx 2Day® A.M.

Saturday pickup is available for the following FedEx Express U.S. service types:

-   FedEx Priority Overnight®
-   FedEx Standard Overnight®
-   FedEx 2Day®
-   FedEx Express Saver®

Saturday Hold at Location service is available for the following FedEx Express U.S. service types:

-   FedEx Priority Overnight®
-   FedEx 2Day®

Saturday Premium Processing service is available for FedEx Express premium parcel services for return and outbound shipment pick up on Saturday through On-call, Regular and automated pickups.

This service is available only in the US (not including Puerto Rico or any other US territory) and CA.

Saturday Pickup is available for the following premium Express parcel services:

-   FedEx First Overnight
-   FedEx Priority Overnight
-   FedEx Standard Overnight
-   FedEx 2Day
-   FedEx 2-Day AM
-   FedEx International First
-   FedEx International Priority Express
-   FedEx International Priority
-   FedEx International Priority Distribution
-   FedEx First Overnight Extra Hours
-   FedEx Priority Overnight Extra Hours
-   FedEx Standard Overnight Extra Hours
-   FedEx One rate (F1R)

**Ground C.O.D.**

_Note: This service is only available for FedEx Ground® Intra Canada shipments._

FedEx Ground® C.O.D. allows the shipper to designate the amount of money that the FedEx Ground driver collects from the recipient when a package is delivered. If the FedEx Ground driver collects guaranteed funds, or a company and/or personal check, the payment is sent directly to the shipper via U.S. mail. If cash is collected, by the next business day, FedEx Ground issues a check to the shipper in the amount of the cash collected. The FedEx issued check is sent to the shipper using the U.S. Postal Service. The shipper must designate the type of payment to be collected by FedEx Ground. FedEx Ground C.O.D. is not available with the FedEx Home Delivery®service.

_Note: FedEx offers a FedEx Ground® Electronic C.O.D. (E.C.O.D.) option. When you contract to use this option, FedEx electronically deposits your C.O.D. payment into your bank account within 24 to 48 hours of collection. Because E.C.O.D. is a contract service, you must contact your FedEx account executive to register for this option. No additional entries are required to create an E.C.O.D. shipment in the Ship request._

**Ground E.C.O.D.**

_Note: This service is only available for FedEx Ground® Intra Canada shipments._

Use the FedEx Ground Electronic C.O.D. service option to receive funds within 24 to 48 hours after shipment delivery. Shippers receive monies via electronic funds transfer. Contact your FedEx Account Executive for more information about E.C.O.D.

E.C.O.D. is not available with FedEx Home Delivery service. You can ship either C.O.D. and/or E.C.O.D., but you cannot use both services simultaneously.

Available options with FedEx Ground E.C.O.D.:

-   FedEx Priority Alert Options
-   Prepaid or third-party billing only
-   Declared Value
-   Alcohol Shipping
-   FedEx Home Delivery Convenient Delivery Options
-   Masked Data

**FedEx International Broker Select**

FedEx International Broker Select® allows you to designate a specific customs broker other than FedEx (or our designated broker).

FedEx International Broker Select Service Details

FedEx International Broker Select is available when using the following services to ship to select countries:

-   FedEx International Priority®
-   FedEx International Economy®
-   FedEx International Ground® to Canada

**Export declaration for Canada outbound shipments**

Export declaration is required by the Canada Border Services Agency (CBSA) to report exports from Canada, for the following conditions.

-   All Canada outbound shipments containing non-restricted goods when the commercial goods are valued at $2,000 Canadian Dollars or more and the destination of the goods is a country other than the United States, Puerto Rico, or the United States Virgin Islands.
-   All Canada outbound shipments which contain controlled, restricted, or regulated goods regardless of value.

Carriers must obtain the proof-of-report number from the exporter before any goods leave Canada. An exporter is required to submit the export declaration before providing the proof-of-report number to the carrier.

**Electronic Export Information**

The Electronic Export Information (EEI) is the equivalent electronic version of the Shipper’s Export Declaration (SED), Department of Commerce (Census Bureau) form 7525-V, which can no longer be submitted to the U.S. government. The EEI provides export statistics and control by reporting all pertinent export data of an international shipment transaction.

The EEI is mandatory and must be submitted electronically by the exporter or agent through the Automated Export System (AES) for commodities listed on the Commerce Control List (CCL).

To file your EEI information with AESDirect visit the AES website (www.aesdirect.gov) because of U.S.Government changes in the EEI process. This Government-supported website facilitates your filing requirements and provides you with the appropriate shipper identification for your packages. FedEx will apply this information with your shipment but will no longer file this information for you.[](http://www.aesdirect.gov)

_Note: You can also use the "File EEI" endpoint in Global Trade API to file your EEI with the U.S. Customs._

For more information on EEI filing, visit the below pages

-   [FedEx International Shipping page](http://www.fedex.com/en-us/shipping/international.html)
-   FedEx Global Trade Manager
-   U.S. Census Bureau

When to File an EEI?

The EEI is required when the total value of goods classified under any Schedule B number exceeds $2500 USD or the commodities listed require an export license.

-   For any single commodity line item value greater than $2,500, EEI filing is mandatory.
-   For any single commodity with value less than or equal to $2,500, EEI filing is not required, with Foreign Trade Regulations (FTR) exemption.

If the shipment is originated from U.S, U.S. Virgin Islands or Puerto Rico to the destination country China, Russia, Venezuela and Hong Kong, irrespective of the shipment value, you must provide the following information:  

-   An EEI filing Internal Transaction Number (ITN)
-   The correct Export Control Classification Number (ECCN) or EAR99 classification number for each item, or
-   An applicable filing exemption

Exemptions are allowed if the shipment.

-   Is eligible for License Exception GOV
-   Is eligible for exceptions in the Export Administration Regulations and Foreign Trade Regulations (FTR), or
-   Consists only of items that are classified as EAR99

Filing EEI is also required for all shipments between the U.S. and Puerto Rico, and from the U.S. or Puerto Rico to the U.S., and Virgin Islands in the following conditions:

-   Shipment of merchandise under the same Schedule B commodity number is valued at more than $2,500 USD and is sent from the same exporter to the same recipient on the same day.  
    _Note: Shipments to Canada from the U.S. are exempt from this requirement_
-   The shipment contains merchandise, regardless of value, that requires an export license or permit.
-   The merchandise is subject to International Traffic in Arms Regulations (ITAR), regardless of value.
-   The shipment, regardless of value, is being sent to Cuba, Iran, North Korea, Sudan, or Syria.
-   The shipment contains rough diamonds, regardless of value (HTS 7102.10, 7102.21 and 7102.31).

_Note:_

-   _EEI is not required for shipments to other U.S. territories (American Samoa, Commonwealth of the Northern Mariana Islands, Guam, Howland Islands and Wake Island) or from the U.S. Virgin Islands to the U.S. or Puerto Rico._
-   _For other destinations, you are required to file an EEI for all U.S. export shipments if one or more commodities (Schedule B number) total more than $2,500USD in the consolidated shipment on any given day._

Shipments from U.S. to Canada

The EEI is not required for shipments from the U.S. to Canada except when one of the following apply:

-   Merchandise is subject to International Traffic in Arms Regulations (ITAR).
-   Shipment requires an export license or permit.
-   Shipped commodity is rough diamonds.

For more information about Electronic Export Information, go to the FedEx Global Trade Manager.

Identify the following information before you complete the Electronic Export Information.

-   USPPI EIN and ID — if the shipper is a corporation, you’ll need the EIN Employer Identification Number (Tax ID) of the U.S. principal party in interest. If the shipper is an individual, you’ll need the person’s social security number.
-   Information about the relationship of parties to the transaction is required. This information indicates whether the sender and recipient are subsidiaries or divisions of the same company or are unrelated.
-   Transportation Reference No. — requires that you supply your FedEx International Air Waybill number.
-   Ultimate Consignee — identify the end user of the merchandise you are shipping only if the ultimate consignee is different from the consignee you entered on your FedEx International Air Waybill.
-   Country of Ultimate Destination — indicate the country where the shipment will ultimately be used.
-   D/F/ or M (Domestic or Foreign in AES) — indicate if the commodity was made or manufactured in the U.S. (D=domestic) or made or manufactured outside the U.S. (F=foreign).
-   Schedule B Number (Commodity Classification Number in AES) — enter the correct Schedule B or Harmonized Code number and units. To find this information, go to the FedEx Global Trade Manager site on fedex.com/gtm or call the U.S. Census Bureau at 1.800.549.0595.
-   Value — enter the selling price or cost of the merchandise if it has not been sold.
-   License No./License Exception Symbol/Authorization (License Number/Citation in AES) — enter your export license number or license exception symbol. To determine if you need to supply this information, call the U.S. Department of Commerce at 1.202.482.4811 or 1.714.660.0144 in Newport Beach, California or go to the Bureau of Industry and Security website.

Electronic Export Information Coding Details

Electronic Export Information (EEI) shipments require either an exemption number or an ITN number (Internal Transaction Number) received from filing your EEI shipment data with AESDirect (go to www.aesdirect.gov to use this application). Elements for submitting your ITN or EEI exemption number to FedEx are provided in the Ship API.

_Note: You can also use the ITN number received through the "Retrieve ITN" endpoint of Global trade API, in the Ship API request._

**Element**

**Description**

Sender/Tins/TinType

As the shipper, your tax identification information must be uploaded to FedEx for EEI shipments. Specify the Employer Identification Number (EIN).  
Valid values:

-   BUSINESS\_NATIONAL
-   BUSINESS\_STATE
-   BUSINESS\_UNION
-   PERSONAL\_NATIONAL
-   PERSONAL\_STATE

Sender/Tins/Number

Specify the Taxpayer Identification/Number with the corresponding ID number for TinType.

CustomsClearanceDetail/ExportDetail/ ExportComplianceStatement

For shipments requiring an EEI, enter the ITN number received from AES when you filed your shipment or the FTR (Foreign Trade Regulations) exemption number.  
The proper format for an ITN number is AES XYYYYMMDDNNNNNN where YYYYMMDD is date and NNNNNN are numbers generated by the AES.

_Note: The ITN or FTR exemption number you submit in the Ship request prints on the international shipping label._

**Commercial Destination Control**

For shipments that travel under an ITAR exemption or ITAR license outbound from the U.S., Puerto Rico, the Virgin Islands, and all other U.S. territories to all other international destinations, the Department of State Commercial Destination Control Statement (DCS) must be printed on your thermal or laser shipping label, the Commercial Invoice, and any supporting export documents accompanying these shipments. The ship API provides three elements in the Ship Service for you to have the appropriate DCS on your shipping label.

Commercial Destination Control Service Details

There are two types of Department of State shipments:

-   Exempt: Department of State exempt statements are allowed for all FedEx international services except FedEx International Ground® shipments to Canada.
-   Licensable: Licensable Department of State shipments are allowed for FedEx International Priority® service only.

_Note: Shipments from the U.S., Puerto Rico, or the U.S. Virgin Islands to Guam, American Samoa, or Northern Mariana Islands are excluded from this requirement._

Inside Delivery Charge

When requested, FedEx may move shipments to positions beyond the adjacent loading area. When a FedEx courier delivers a shipment per this request, FedEx assesses an inside delivery charge in addition to all other applicable charges.

**Future Day**

Use Future Day shipping to prepare a FedEx Express shipment up to ten (10) days from the actual ship date. A label prints when the shipment is processed, but the shipment can be held until the specified day becomes current before tendering the package to the courier.

Future Day is allowed for all FedEx Express shipping services. A FedEx Express label appears on the specified ship date.

_Note: Use **FUTURE\_DAY** enumeration value in the **requestType** field to receive pickup rate quotes for future day shipments. Provide details in the requestedShipment.pickupDetail.readyDateTime and requestedShipment.pickupDetail.latestPickupDateTime fields to receive accurate values in the response._

**Pharmacy Delivery**

Pharmacy Delivery allows you to designate pharmacy as the required delivery location for a shipment, bypassing loading docks and receiving areas.

Pharmacy Delivery provides the ability for customers to determine if the pharmacy delivery special service type is available for a shipping destination on a U.S. Domestic Express parcel shipment.

_Note:_

_-   This applies to both outbound as well as return shipments (print and email returns).
-   Express tags are not included.
-   For Pharmacy Delivery, U.S. Domestic includes only the 50 U.S. states (including Alaska and Hawaii) and does NOT include Puerto Rico or any of the U.S. territories (i.e., U.S.Virgin Islands, American Samoa, Guam, etc.).
-   The packaging types allowed for Pharmacy Delivery are same as those allowed for 'like' shipments without pharmacy delivery._

**FedEx Third Party Consignee**

A neutral delivery service option that allows a manufacturer to bypass the importer’ s distribution center and ship directly to the ultimate recipient without exposing the importer’ s cost and terms with the manufacturer. A value-added service option for customers who do not wish to reveal the import customs value of the shipment to their recipient. This enables shipments to be delivered to recipients without a Commercial Invoice. No customs information is made available to the recipient.

Service benefits

-   Improved end-to-end transit times – goods are shipped directly to the end customer.
-   Extra destination handling and warehousing costs are eliminated.
-   Customs duties and taxes are based on the import transaction, not the subsequent sales value to the end customer.

Transit times\*

FedEx Third Party Consignee gives you the same delivery times as those specified for the particular FedEx® service you choose to use. Our transit-time commitment is backed by our money-back guarantee.\* \*

Service options

You can choose the FedEx Third Party Consignee service option with either FedEx International Priority® or FedEx International Priority® Freight and in the shipment request, provide shipment level special service type as _specialServiceTypes_\=THIRD\_PARTY\_CONSIGNEE.

Service restrictions

-   Requires a designated importer and a separate recipient for delivery.
-   Dangerous goods, perishables and _brokerselect_ option are not available.
-   Intra-country and intra-European shipments are not allowed.

\* Transit times and delivery commitments may vary depending on origin and destination. Please contact FedEx Customer Service for further details.

[\* \* For details about the FedEx Money-Back Guarantee, see Our Services at fedex.com. For more information, contact your FedEx account executive or go to](https://www.fedex.com/en-us/service-guide/dangerous-goods/how-to-ship.html#lithium-batteries-dangerous-goods) [FedEx/TPC.](http://www.fedex.com/id/services/tpc.html)

**Collect on Delivery (C.O.D.)**

The FedEx® Collect on Delivery (C.O.D.) option allows you to designate the amount of money the FedEx Express courier collects from your recipient when the package is delivered. Enrollment is not required. Your recipient can pay by personal check, money order, cashier’s check, company check, official check, validated check, cash or any options. FedEx returns payment to you the next business day by FedEx Standard Overnight® (where available; otherwise, FedEx 2Day®). An additional surcharge applies to C.O.D. shipments.

**Hold at FedEx Location**

FedEx Express Hold at FedEx Location (HAL) service is available to customers who want to pick up a package at a designated FedEx location. For example, approved wine shippers may want to use the FedEx Express Hold at FedEx Location service for consumers who prefer to pick up their wine shipments from a FedEx Office® or FedEx Express counter location.

If your transaction specifies Hold at Location, you must specify the location ID of the FedEx location offering the Hold at Location service. The FedEx OnSite locations can also be specified for Hold at location service. Select the FedEx pickup location (a designated FedEx Office® Print and Ship Center, FedEx Office® Ship Center, or FedEx World Service Center®) by using the drop-off locator (contact your FedEx customer integration consultant if you need assistance).

When you include this option, FedEx Express labels display “Hold at Location” to indicate packages will not be delivered by a FedEx courier.

**FedEx OnSite**

FedEx OnSite service expands the FedEx network of retail locations by offering FedEx Express and Ground pickups and drop-offs at third-party alliance locations. Customers can interact with FedEx at approximately 2,500 FedEx-staffed locations and approximately 11,000 FedEx retail alliance locations; 80% of the U.S. population is within 5 miles of a FedEx OnSite location.

FedEx OnSite enables FedEx customers to choose FedEx Onsite Locations that provide the convenience of package drop-off and pickup at non-FedEx owned locations with extended hours and secured package storage.

### FedEx One Rate®

FedEx One Rate is flat-rate shipping that does not require you to weigh or measure shipments under 50 lbs.. You can choose the box or tube that best fits the size of what they need to ship and fill the package to capacity, as long as the shipment doesn’t exceed 50 pounds. It gives you a simple, predictable, flat rate shipping option for your FedEx Express packages. FedEx One Rate a shipping portfolio based on six FedEx Express Service options, combined with seven FedEx proprietary (white) packaging types.

**FedEx One Rate Packaging**

The FedEx packaging types that are valid/available with the One Rate pricing option are the following:

-   FEDEX\_ENVELOPE
-   FEDEX\_SMALL\_BOX
-   FEDEX\_MEDIUM\_BOX
-   FEDEX\_LARGE\_BOX
-   FEDEX\_EXTRA\_LARGE\_BOX
-   FEDEX\_PAK
-   FEDEX\_TUBE

Your own packaging is not available for the One Rate pricing option.

For more information about packaging services refer to [Packaging Types](https://developer.fedex.com/api/en-us/guides/api-reference.html#packagetypes).

**How to Specify One Rate Pricing**

To specify FedEx One Rate Pricing Option, perform the following steps:

-   Specify the \\"FEDEX\_ONE\_RATE\\" Shipment Special Service.
-   Specify one of the Packaging Types.
-   Specify a U.S. origin and a U.S. destination.
_Note: Intra-Hawaii shipments are not allowed for One Rate pricing._-   Specify one of the following FedEx Express service types:
    -   FIRST\_OVERNIGHT
    -   PRIORITY\_OVERNIGHT
    -   STANDARD\_OVERNIGHT
    -   FEDEX\_2\_DAY
    -   FEDEX\_2\_DAY\_AM
    -   EXPRESS\_SAVER

_Note: FedEx customers can request both One Rate and weight based (non-One Rate) rates in a single Rate Request by specifying \\"FEDEX\_ONE\_RATE\\" as a Service Option Type in the request._

### FedEx Shipping Labels

FedEx API supports a wide variety of labels. FedEx API supports three types of label options, including thermal, plain paper, and customizable labels. You can use the Ship API and Open Ship API endpoints to produce a wide variety of labels.

FedEx offers 2 label formats to support shipping services:

-   Thermal Labels
-   Laser Labels

**Thermal Labels**

FedEx API allows you to print shipping labels for all shipping types, such as FedEx Express®, FedEx Ground®, and FedEx International Ground® using a variety of thermal label printers.

The following thermal label sizes are supported by FedEx API:

-   4'' x 6'' – without a configurable document tab (Doc-Tab)
-   4'' x 6.75'' – with or without a Doc-Tab
-   4'' x 8'' – provides space to include a graphic or text file of your choice
-   4'' x 8.5'' – with a configurable document tab (specifically included for tire identification label)
-   4'' x 9'' – provides space for graphics or text as well as a Doc-Tab
-   4'' x 10.5'' – with a configurable document tab (specifically included for tire identification label)  
    

The label stock types 4"X8.5” and 4"X10.5” includes an added doc tab with identical barcodes. One barcode is displayed on the main label and the other one on the doc tab. This label stock type value is helpful for tire packages as one label can be positioned on the tire’s tread and the additional doc tab label with a duplicate copy of the barcode and operational instructions for the sidewall of the tire. Using these label stock types reduces tire relabels and increased dimensional scans optimizes recovery. For more information on label stock refer to [Label Stock Types](https://developer.fedex.com/api/en-us/guides/api-reference.html#labelstocktypes).

_Note:Doc-Tab is a removable sticky tab with additional shipping information which can be selected for a label stock, while printing shipping labels using a thermal printer._

**Thermal Label Elements**

Thermal shipping labels contain three basic elements:

-   Human-readable content: this part of the label contains the shipping information from the FedEx Ship API.
-   Ground Human Readable Barcode will be encrypted by default.
-   Two dimensional (2D) barcode: the dimensional alphanumeric barcode stores data for both FedEx Express and FedEx Ground shipments using the American National Standards Institute (ANSI) MH10.8.3 standard. The 2D barcode is created using the Portable Data File (PDF) 417 symbology.
-   FedEx specific barcode:
    -   ASTRA (Advanced Sorting Tracking Routing Assistance) for FedEx Express shipments until the FDX 1D barcode has been fully phased in; barcode '96' for FedEx Ground and FedEx Home Delivery® FedEx Ground also allows for the use of the SSCC-18 '00' barcode.
    -   FedEx 1D (FDX1D) barcode for FedEx Express shipments is created using ANSI/AIM BC4-1995 (Uniform Symbology Specification CODE-128C).

Key Information to generate a Thermal Label

The following are the key information required to generate a thermal label:

-   LabelFormatType: Required to receive the correct label image in the Ship Reply API:
    
    Valid Values:
    
    -   COMMON2D: The label format type to receive a label.
    -   LABEL\_DATA\_ONLY: The value used to receive the barcode data if you create a custom label.
-   ImageType: Required to format the thermal label for the printer you use; provides the type of data stream or bitmap to be returned.
    
    Valid values:
    
    -   EPL2 – Eltron (Label Stock Types)
    -   ZPLII – Zebra (Label Stock Types)

_Note: All labels required for a shipment are generated and returned in a single buffer._  

Supported Thermal Printers

The following thermal printers are recommended with FedEx API:

-   Unimark
-   Eltron
    -   Orion (EPL2)
    -   Eclipse (EPL2)
-   Zebra
    -   LP2443 (EPL2)
    -   LP2844 (EPL2)
    -   Gk420 (ZPL)
    -   LP2348 Plus (EPL2/ZPL)
    -   Z4M Plus (ZPL or EPL)
    -   ZP500/ZP505 (EPL2/ZPL)
    -   Z4M/Z4M+ (EPL2/ZPL)
    -   ZM400 (EPL2/ZPL)
    -   ZT410 (EPL2/ZPL)
    -   Other ZT4xx series printers (EPL2/ZPL)

_Note: These printers are all compatible with the ASCII Eltron Programming Language (EPL2) page mode. Thermal printers are supported both as a direct write to the printer connected to a system serial port, and as a native Windows installed printer for LPT, Serial, or USB connections. The firmware versions of FedEx provided printers may vary by region._

Number of Thermal Labels Printed Per Service

The following table indicates the number of each type of label needed for a specific special service. All the necessary labels are generated by a call to the FedEx Common Label Server (CLS), and CLS returns a single buffer with the exception of the C.O.D. Return labels.

**Printed Per U.S. Service**

**Service Type**

**Thermal Labels (FedEx CLS will return the appropriate number of labels in the response)**

FedEx Express U.S.

1 Shipping label

FedEx Ground U.S. / FedEx Home Delivery

1 Shipping label

**Printed Per U.S. Export International Service**

**Service Type**

**Thermal Labels (FedEx CLS will return the appropriate number of labels in the response)**

FedEx Express U.S. Export International

1 Shipping label

2 Recipient labels

FedEx Express U.S. Export International Broker Select Option

1 Shipping label

2 Recipient labels

FedEx Ground U.S. Export International

1 Shipping label

FedEx Ground U.S. Export International C.O.D.

1 Shipping label

2 C.O.D. Return labels

**Printed Per Intra-Canada Service**

**Service Type**

**Thermal Labels (FedEx CLS will return the appropriate number of labels in the response)**

FedEx Express intra-Canada

Non-DG (Dangerous Goods)/Dry ice shipment:

1 Shipping label

FedEx Ground intra-Canada

1 Shipping label

FedEx Ground intra-Canada C.O.D.

1 Shipping label

2 C.O.D. Return labels

**Printed Per Canada Export International Service**

**Service Type**

**Thermal Labels (FedEx CLS will return the appropriate number of labels in the response)**

FedEx Express Canada Export International

Non-DG/Dry ice shipment:

1 Shipping label

2 Recipient labels

FedEx Express Canada Export International Broker Select

Non-DG/Dry ice shipment:

1 Shipping label

2 Recipient labels

FedEx Ground Canada (CA) Export International

1 Shipping label

**Printed Per Philippines and Thailand inbound shipments**

**Service Type**

**Thermal Labels (FedEx CLS will return the appropriate number of labels in the response)**

Philippines inbound shipments

2 Shipping labels with account number printed

1 Recipient label without account number printed

3 Commercial Invoice copies

Thailand inbound commodity shipments

3 Shipping labels with account number printed

1 Recipient label without account number printed

Thailand inbound document shipments

2 Shipping labels with account number printed

1 Recipient label without account number printed

**Doc-Tab**  

If you print shipping labels using a thermal printer, you may choose label stock that includes a Doc-Tab, a removable sticky tab with additional shipping information. You can configure this shipping information from your shipping data or choose to print configurable data that is specific to your shipping needs.  

**Laser Labels**

FedEx API supports label printing with a laser printer. These labels are usually printed on U.S. Letter or A4 paper and folded in half to fit in to the standard FedEx label pouch. Labels that are printed with a laser printer are generated in PDF format and do not need to be scaled or resized.  
For more information on label stock refer to [Label Stock Types](https://developer.fedex.com/api/en-us/guides/api-reference.html#labelstocktypes)

**Prerequisites**  

The following requirements apply to PDF labels:

-   Adobe Reader 6.0 or higher is required to process the label.
-   Printer driver configuration must have printer scaling set to none.
-   Using an HTML wrapper is not necessary for displaying a plain paper PDF label in a browser.
-   Acrobat recommends the following browsers for viewing PDF documents:
    -   Microsoft Internet Explorer 10 or higher
    -   Firefox 1.0 or higher
    -   Mozilla 1.7 or higher

The PDF label option eliminates the need to specify the image orientation parameter (width and height) or the screen resolution to display the label properly in the browser.

**Laser Label Elements**

Laser shipping labels contain three basic elements:

-   Human-readable content – This part of the label contains the shipping information from FedEx Ship API.
-   Ground Human Readable Barcode will be encrypted by default.
-   Two-dimensional (2D) barcode – The dimensional alphanumeric barcode stores data for both FedEx Express and FedEx Ground shipments using American National Standards Institute (ANSI) MH10.8.3 standard. The 2D barcode is created using the Portable Data File (PDF) 417 format.
-   FedEx specific barcode:
    -   ASTRA (Advanced Sorting Tracking Routing Assistance) for FedEx Express shipments until the FDX 1D barcode has been fully phased in; barcode '96' for FedEx Ground and FedEx Home Delivery shipments. FedEx Ground also allows for the use of the SSCC-18 '00' barcode when applicable.
    -   FedEx 1D (FDX1D) barcode for FedEx Express shipments is created using ANSI/AIM BC4-1995 (Uniform Symbology Specification CODE-128C).

**Key Information to generate a Laser Label**

The following FedEx API elements are required to generate a laser label:

-   LabelSpecification/LabelFormatType: Required to receive the correct label image in the Ship Reply API:  
    
    Valid values are:
    
    -   COMMON2D – Label format type to receive a label.
    -   LABEL\_DATA\_ONLY – This value is used to receive the barcode data if you create a custom label.
-   LabelSpecification/ImageType: Required to indicate label formatting. Type of data stream or bitmap to be returned:
    
    Valid values are:
    
    -   PDF – plain paper
    -   PNG – plain paper

-   LabelSpecification/LabelStockType: Required for all label types. Specify whether label stock has Doc-Tab on leading or trailing end of labels or has no Doc-Tab. When using an ImageType of PDF or PNG, these values display a laser format label:
    -   PAPER\_4X6
    -   PAPER\_4X8
    -   PAPER\_4X9
    -   PAPER\_4X675
    
    These values display a plain paper format shipping label:
    
    -   PAPER\_7X47
    -   PAPER\_85X11\_BOTTOM\_HALF\_LABEL
    -   PAPER\_85X11\_TOP\_HALF\_LABEL
    -   PAPER\_LETTER

_Note: If you request a plain paper label, the data returned is a Base64 encoded label image, which must be Base64 decoded prior to displaying the label file._

**Supported Laser Printers**

Most laser printers are supported for this label type; however, labels will not be accepted if they are printed on an ink jet printer.

_Note: If you are using a color laser printer, the color definition should be set to black, even if the printer only has a black cartridge installed_

**Number of Laser Labels Required Per Service**

The following table indicates the number of each type of label needed for a specific special service. All the necessary labels are generated by a call to the FedEx Common Label Server (CLS), and CLS returns a single buffer with the exception of the C.O.D. Return labels.

**Printed Per U.S. Service**

**Service Type**

**Laser Label– PDF Format**

FedEx Ground / FedEx Home Delivery U.S.

1 Shipping label

**Printed Per U.S. Export International Service**

**Service Type**

**Laser Label– PDF Format**

FedEx Express U.S. Export International

1 Shipping label in the reply; a minimum of 3 labels must be printed – 1 label on the package and 2 in the document pouch.

FedEx Express U.S. Export International Broker Select

1 Shipping label in the reply; a minimum of 3 labels must be printed – 1 label on the package and 2 in the document pouch.

FedEx Ground U.S. Export International

1 Shipping label

FedEx Ground U.S. Export International C.O.D.

1 Shipping label

2 C.O.D. Return labels

**Printed Per Intra-Mexico Service**

**Service Type**

**Laser Label– PDF Format**

FedEx Express Intra-Mexico

FedEx Express Intra-Mexico

Non-DG (Dangerous Goods)/Dry ice shipment:

1 Shipping label

**Printed Per Intra-Canada Service**

**Service Type**

**Laser Label– PDF Format**

FedEx Express Intra-Canada

FedEx Express Intra-Canada

Non-DG (Dangerous Goods)/Dry ice shipment:

1 Shipping label

FedEx Ground Intra-Canada

1 Shipping label

FedEx Ground Intra-Canada C.O.D.

1 Shipping label

2 C.O.D. Return labels

**Printed Per Canada Export International Service**

**Service Type**

**Laser Label– PDF Format**

FedEx Express Canada Export International

FedEx Express Canada Export International

Non-DG/Dry ice shipment:

1 Shipping label

2 Recipient labels

FedEx Express Canada Export International Broker Select

FedEx Express Canada Export International Broker Select

Non-DG/Dry ice shipment:

1 Shipping label

2 Recipient labels

FedEx Ground Canada (CA) Export International

1 Shipping Label

**Printed Per Philippines and Thailand inbound shipments**  

**Service Type**

**Thermal Labels (FedEx CLS will return the appropriate number of labels in the response)**

Philippines inbound shipments

2 Shipping labels with account number printed

1 Recipient label without account number printed

3 Commercial Invoice copies

Thailand inbound commodity shipments

3 Shipping labels with account number printed

1 Recipient label without account number printed

Thailand inbound document shipments

2 Shipping labels with account number printed

1 Recipient label without account number printed

**Custom Label**  

FedEx allows customizing of the FedEx generated label. You may add text pertaining to your business and choose the type of barcode (symbology) used on FedEx documents and labels in the custom portion of thermal labels.

To support your shipping application, FedEx Ship API provide two options for customizing your shipping label:

-   Place the PNG PAPER 7'' x 475'' graphic on your label stock. For example, you may create a packing list on an 8-1/2'' x 11'' form. As part of this form, you may also place the 7''x 475'' PNG PAPER graphic instead of creating a custom label on your own.
-   Add a graphic or text file to the 4'' x 8'' or 4'' x 9'' thermal label. This label size provides 2 inches of space for your graphic or text.

_Note: The label's human readable content and barcode in the common portion of the label cannot be altered._

Custom Validator Label

You can create non-shipping custom labels at both package-level and shipment-level by specifying what custom information is desired, how to format that information, and where to place it on the custom label. Custom labels are limited to the thermal label format.

Customize a Thermal Label

FedEx API provides two thermal label formats that you can customize with either a graphic or text file to prevent the need for creating a custom label. These labels support all FedEx shipping services. These formats are:

-   4'' x 8'' thermal label without Doc-Tab
-   4'' x 9'' thermal label with Doc-Tab

These label types provide a two-inch customizable section. This feature is applicable to the thermal label printed on a thermal printer set to 203 DPI or 300 DPI.

Rules for Custom Label

Rules for using the label formats are:

-   Only the shipping label can be customized. For example, if you print a 4'' x 8'' Express shipping label with your logo, the secondary recipient labels will not display it.
-   The customizable graphic or text must not exceed 2 inches high and 4-1/2 inches wide.
-   No correction is provided by FedEx. The graphic and/or text prints as it is submitted in the shipping service.
-   If all the necessary data for printing the graphic and/or text is not provided (for example, X and Y coordinates), a valid shipping label is returned without the customized data. You must cancel the shipment represented by this label if you attempt to recreate another label with the graphic and/or text.
-   For 203 DPI (8 dots/mm) printer resolution, regarding the placement on X and Y coordinates, insertion point coordinate datum is the intersection of the top and left edges of the 4.00” x 6.75” thermal label with bottom doc tab. For 4.00” x 6.75” thermal label with top doc tab, increment insertion point coordinate Y values by 164 dots. For 4.00” x 6.00” label without doc tab, increment insertion point coordinate Y values by 8 dots. Thermal label element attributes are based on 203 DPI (8 dots/mm) printer resolution.
-   For 300 DPI (12 dots/mm) printer resolution, regarding the placement on X and Y coordinates, insertion point coordinate datum is the intersection of the top and left edges of the 4.00” x 6.75” thermal label with bottom doc tab. For 4.00” x 6.75” thermal label with top doc tab, increment insertion point coordinate Y values by 246 dots. For 4.00” x 6.00” label without doc tab, increment insertion point coordinate Y values by 12 dots. Thermal label element attributes are based on 300 DPI (12 dots/mm) printer resolution.  
    _Note:_
    -   _For the FXD1D barcode, the X-dimension (width of the narrowest bar in the symbol) is 15 mil (3 dots) for 203 DPI printer, and 13.3 mil (4 dots) for 300 DPI printer._
    -   _For the 2D PDF-417 barcode, the X-dimension is 10 mil (2 dots) for 203 DPI printer. To get the closest equivalent X-dimension for 300 DPI printer, 9.99 mil (3 dots) must be used._
    -   _For the Shipper/Misc block at the top of the label and Shipper Reference block under the recipient information where very small fonts are used, label developers need to check the ZPL programming guide to cross-reference the font-set characteristics to select an equivalent performing font-set for various other print head resolutions._
-   Character insertion point is the top left corner of the first character in the string, at the cap line.
-   Printer restrictions require the position origin at the top left quadrant of the front. Therefore, it is possible for data to start in the customizable section of the label and write down into the FedEx portion of the label (actual thermal label data). If this occurs, your logo or text will overlap with the content in FedEx label information. You must correct this positioning to use the shipping label.
-   The addition of Doc-Tab information to the 4'' x 9'' label must be configured using the same process as you would use for a standard 4'' x 6'' Doc-Tab thermal label.

_Note: Only single bit color images should be added since labels will print in black and white._

Custom Label Graphic Entries Elements

API provides PNG (Portable Network Graphic) images for FedEx Express, and FedEx Ground labels. The PNG label graphic is a replica of the thermal or plain paper labels supported by API. This label option allows you to place the PNG label graphic on your label stock to prevent the need for creating a custom label.

The following requirements apply when using the 4'' x 6'' PNG graphic embedded in your shipping document:

-   Label Stock
-   Printer
-   Scaling

Label Stock

4'' x 6'' PNG labels should only be used with peel-and-stick label stock. The FedEx Ground and FedEx Express label validation teams will reject 4'' x 6'' PNG labels that are not on peel-and-stick label stock, including any labels printed on plain paper.

Printer

Laser printers are recommended for printing labels. Ink jet printers should not be used because of their inconsistency in creating scannable barcodes. The 4'' x 6'' PNG label cannot be printed using a color printer unless the color definition is set to black, even if the printer only has a black cartridge installed. This setting is necessary to achieve the correct barcode definition for scanning at the FedEx hubs.

Scaling

The image returned in your shipping transaction is 200 dots per inch (DPI) and measures 4'' (W) x 6'' (H) or 800 x 1200 pixels. This label has a vertical orientation and is designed to print in a 4'' x 6'' label area. When printed, the label should measure 4'' x 6''.

To produce the label and barcodes in the required DPI, you must scale (or resize) the image before printing. How you scale the image depends on the application you are using to view and print the label. To scale the PNG image for a 4'' x 6'' label in inches: use 4'' width and 6'' length exactly.

**Label Review Checklist**  

All Barcodes

Required for validation:

-   Quiet Zone: Must always have at least 0.1' white space both above and below barcode.
-   Quiet Zone: Must always have at least 0.2' white space both left and right of barcode.
-   Validate that all barcodes meet minimum height requirements.

Print Quality

Common problems that cause labels to be rejected:

-   Split Bars
-   Faded Print/White Voids
-   Repeating White Voids (roller problem)
-   Smudging (thermal transfer)
-   Flaking (laser) indicates Toner Fusion Problem
-   Wrinkled in the Print (thermal transfer)
-   Print Contrast for direct thermal labels must be at least 90%

Human Readable details for Ground Labels

For the Human Readable for FedEx Ground Labels, the following are required for validation:

-   Data matches barcode
-   FedEx Ground logo: Logos are available for download from the FedEx Identity website fedex.com.
-   FedEx Home Delivery logo: labels must have a large “H” in a box within 1'' of the ship to address. The “H” must be at least .25'' x .70''.
-   Service Description
-   Sender Information
-   Recipient Information
-   Postal code and routing
-   Ship date
-   Actual Weight
-   Customer Automation Device information (meter, application/system, version)
-   Dimensions
-   Miscellaneous reference information
-   Tracking number and Form ID (Tracking number must be 14 digits)
-   Airport Ramp ID
-   Postal code

Human Readable details for Express Labels

The following elements must be printed on the label to pass validation:

-   FedEx Express logo: Logos are available for download from the FedEx Identity Website fedex.com.
-   Service Description
-   Package type, if International
-   Delivery day of the week (example: MON for Monday)
-   Deliver by date
-   Meter number
-   Ship date
-   Format of piece count, Master label verbiage, CRN label verbiage on all MPS
-   Airport Ramp ID
-   Postal code and routing
-   URSA routing prefix and suffix
-   Handling codes
-   Service area commitment
-   Recipient and shipper's phone numbers
-   Weight
-   Dims, if applicable
-   Reference field if an alcohol shipment
-   Tracking number and Form ID (Tracking number must be 14 digits)
-   In the ASTRA label, the 12-digit tracking number is located in positions 17 through 28 of the 32-character barcode. In the new FDX 1D barcode, the tracking number occupies positions 21 through 34. The FedEx Express tracking number will continue to be 12 digits. Zeros will occupy the leading two positions.

### FedEx Ground U.S. Shipping

FedEx Ground® U.S. is the appropriate service for economical delivery to U.S. business addresses while selecting a ground delivery service. FedEx Home Delivery® is suitable for delivery to U.S. residences. Both services are available throughout 50 states in U.S. and offer day-definite delivery based on the distance to destination.

**FedEx Home Delivery**

When shipping packages to residential addresses within the U.S., use the FedEx Home Delivery service. FedEx Ground designates FedEx Home Delivery service as the carrier for residential deliveries under 150 lbs.

Residential customers can receive package delivery by end of day Monday to Friday and Saturday to most and many on Sunday.

The FedEx Ground, FedEx International Ground and FedEx Home Delivery shipments display the transit quote with a precise estimated delivery date/time. \[Service ENUM : GROUND\_HOME\_DELIVERY\]

**FedEx Ground U.S. Service Options**

The following some of the key shipping options available:

-   Future Day Shipping
-   Hazardous Materials FedEx Ground U.S.
-   Hold at FedEx Location
-   FedEx Home Delivery Service Details
-   Alternate Return Address
-   Delivery Signature Options
-   Shipment Notification in the Ship Request
-   Variable Handling Charges

**FedEx International Ground Shipping**

FedEx International Ground is a direct-ship method for you to send single or multi-weight small package shipments directly from the U.S. to Canada, Canada to the U.S. There are no minimum package requirements.

FedEx International Ground provides day-definite delivery throughout Canada:

-   Delivery Times: 2–7 business days.
-   Service Days: Monday through Friday by the end of the business day.
-   Delivery Area: Canada.
-   Package Size and Weight: Up to 150 lbs., 108\\" in length, and 165\\" in length and girth (L+2W+2H). For packages weighing 100–150 lbs., specific guidelines must be followed for marking heavy packages. For more information, go to http://www.fedex.com/us/services/intl/ground.html.
-   Exceptions: FedEx Ground® cannot deliver to P.O. boxes.
-   No hazardous materials (except for certain shipments to Canada that contain dry ice or are classified as Other Regulated Materials– Domestic \[ORM-D/Limited Quantity\]).
-   Customs clearance is included for shipments to Canada through our brokerage-inclusive service, a fee applies. Brokerage-inclusive service may not be available with all electronic shipping solutions.
-   A CI is needed for all shipments.

**FedEx International Ground Service Details**

The following service options are available for use with FedEx International Ground shipping:

-   Alternate Return Address
-   Commercial Destination Control
-   Delivery Signature Option
-   Future Day Shipping
-   Mask Account Number (FedEx International Ground)
-   Shipment Notification in the Ship Request
-   Variable Handling Charges

**International Ground Parcel Distribution Service**

International Ground parcel distribution service allows FedEx Ground to consolidate International Ground shipments into one unit that is cleared and handled as one customs entry with a single broker entry fee. Service is available from the U.S. to CA and CA to U.S. using the FedEx Ground network. This service is offered exclusively as Broker Select. The Broker Inclusive option is not available.

**Clearance Requirements**

All export documents must be placed in the international document pouch and attached to the FedEx International Ground package, or the first package in a multiple-piece shipment (MPS). Each shipment must include:

-   1 signed copy and 4 originals for Canada, and 1 signed copy and 2 originals for Puerto Rico.
-   The broker information (including Non-Resident Importer (NRI) designation if applicable) must be on the Commercial Invoice.
-   The Commercial Invoice must also have contract details for your recipient, including a phone number.
-   The recipient is automatically the Importer of Record (IOR) unless otherwise designated on the Commercial Invoice.

**Brokerage and Billing Options between U.S. and Canada**

Features that will improve your shipping experience and increase the ease of trans-border shipping of FedEx International Ground packages between the U.S. and Canada.

Brokerage Inclusive Services

Through the new default brokerage-inclusive service option, FedEx International Ground shipping gives you one point of contact and initiates regulatory clearance while your packages are still en route.

Broker Selection Option

If you prefer to use your own broker, you have the option to do so.

Flexible Billing Solutions

You now have the option to bill duties, taxes, and ancillary fees to the shipper, the recipient, or a third party.

### Multiple-Piece Shipping (MPS)

A multiple-piece shipment (MPS) consists of two or more packages shipped to the same recipient addresses. The first package in the shipment request is considered the master package.

To create a multiple-piece shipment:

-   Include the shipment level information such as _serviceType, packagingType, totalWeight, totalPackageCount,_ and _requestedPackageLineItems_ details for the master package. \[Note: The _sequenceNumber_ for master package must be equal to 1.\]
-   For printing label per package, include Master tracking details in element _masterTrackingId_ for all subsequent packages.

Following are the Multiple-Piece Shipping Processing options available with this API:

**Print Package Label One At A Time**

This processing option allows you to process the MPS shipments and get labels one at a time. This is an optimal method, in case the packages to be processed sequentially and labels to be generated per package.

When you need this capability for your shipments, In the shipment request provide element _oneLabelAtATime as true_ as true along with all necessary MPS elements.

The output of the first request should generate label and tracking number which is master tracking number. Provide this master tracking number in the element _masterTrackingId_ to process subsequent ship request and generate labels with tracking numbers (child tracking numbers) for the defined total package count (_groupPackageCount_).

_Note:_

-   _The maximum packages allowed in this processing option are 200._
-   _The final shipment documents/reports will be generated if sequenceNumber is equal to groupPackageCount._

**Print All Package Labels At Once**

This processing option allows you to process the MPS shipments and get labels in single shot. When this option is selected, your shipments will either be processed synchronously or asynchronously depending on the number of packages or package level commodities in your shipment.

Synchronous Shipment Processing

Synchronous processing is one of the optimal processing method, which is used internally when a shipment has either 40 or less packages (_groupPackagecount<=40_) with limited commodities in the shipment and _oneLabelAtATime_ as _false_.

Shipment request with 40 or less packages will be processed synchronously and the labels and other shipment documents/reports will be generated instantaneously. This process is optimal for shippers, if there is a time constraint and if the labels must be printed immediately.

_Note: The maximum 40 package limit is indicative and is not a fixed limit. The limit is also dependent on the combination of packages and commodities in the shipment. For more information, contact your FedEx support team_

_Example:_ Your shipment request consists of 10 packages, when submitted will be processed synchronously. In the response, 10 labels will be created, and either label URLs or encoded labels as requested is provided in the response.

The following high-level workflow demonstrates synchronous shipment processing:

-   Use endpoint **_Create Shipment_** to create shipment with 1-40 packages.
-   Successful request should generate labels and the output response will have either label URLs or encoded labels as requested.
-   If the shipment has errors, the error details will be provided in the response.
-   After correcting the errors, recreate and submit the shipment for successful response.

_Note:_ 

-   _In this method, if you need to add more packages to an existing shipment, you can add only up to total 40 packages._
-   _In synchronous processing request, the default value for element **processingOptionType** is **SYNCHRONOUS\_ONLY** and shipment will be processed synchronously even if the above element is not provided or value passed is either **SYNCHRONOUS\_ONLY** or **ALLOW\_ASYNCHRONOUS** in the request._

Asynchronous Shipment Processing

Use Asynchronous processing option when the shipment packages exceeds 40 (_totalPackageCount>40_). This is a very convenient method, when your package volume is large, and you want to submit the bulk shipments periodically. This bulk shipment submission uses various expensive FedEx resources & operations, when submitted at once. With this processing option, FedEx internally ensures that these bulk shipments are processed, and you can get the label data periodically.

When the transaction is asynchronously processed, the reply to this request only confirms that the request is queued successfully but the shipment itself might not be successfully processed and also returns _jobId_ to retrieve the result later.

_Note: This process requires some time for the shipment to be processed successfully before you retrieve the result._

For retrieving the asynchronous shipment result, use endpoint Retrieve Async Ship and provide _jobId_ and _accountNumber_ details in the request. The response to this request will either return shipment result data with label details or the shipment error details.

_Example:_ Your shipment consists of 45 packages, when submitted will be processed asynchronously. In the response, a _jobId_ will be returned. You should then use endpoint _Retrieve Async Ship_ to retrieve the shipment result to get the label data.

The following high-level workflow demonstrates asynchronous shipping processings:

-   Use endpoint **_Create Shipment_** to create shipment with more than 40 packages.
-   Specify all necessary shipment details along with element _processingOptionType_ as _ALLOW\_ASYNCHRONOUS_ and Specify element _labelResponseOptions_ as _LABEL_.
-   The successful submission will provide _jobId_.
-   Use the _jobId_ and _accountNumber_ to retrieve the output results using **_Retrieve Async Ship_** endpoint.
-   The successful output will provide the resultant data and label details.
-   If the result has errors, the error details will be provided in the response.
-   After correcting the errors, recreate and submit the shipment for successful response.

_Note:_

-   _In this method, in a single request the maximum total allowed packages are 300.or up to 999 commodities._ 
-   _In this method, once the request is submitted, you can not add new, modify or delete the packages in the original request._  
    
-   _If there are errors in the asynchronous shipment response, you cannot reconfirm or fix it in the same shipment request. You must modify or fix the errors and submit a new shipment request_  
    

### Return Shipping

Returns are available for domestic and international shipping in a variety of areas wherever existing FedEx Express services are available. You can associate or \\"link\\" an outbound shipment with a return shipment using the tracking numbers. When processing your global return package with FedEx automation, you will need to provide a reason for that return for customs clearance purposes, on both the outbound and return shipments, when processing your package. Identify your package as a return and include the return type. Select the correct return reason from the table below.  
  

**OUTBOUND  
What's the reason for including a return label?**

**RETURN  
What's the reason for the return?**

**When to use?**

Courtesy Return Label

Rejected Merchandise

Select these two reasons when you're including a return label for your customer in your shipment, but typically don't expect returns.

For Exhibition/Trade Show

Exhibition/Trade Show Returns

Select these two reasons when the goods you're shipping are for a show, exhibition, trade show or event.

Item for Loan

Return of Loaned Item

Select these two reasons when the goods you're shipping are for temporary use by the recipient to be returned to you in an unaltered state.

For Repair/Processing

Repair/Processing Returns

Select these two reasons when the goods you're shipping will be either repaired or otherwise processed before being returned to you. Processing can include things like modification, incorporation, or treatment of some kind.

Items for Use in a Trial

Trial Returns

Select these two reasons when the goods you're shipping are for a trial and will be returned to you.

Replacement

Faulty Item Being Sent

Select these two reasons when you're shipping a replacement item in advance of receiving a faulty item back.

Temporary Export – Other

Return – Other

Select these two reasons when none of the other reasons listed apply. When you select these reasons, you'll have the ability to state your exact reason for the return.

FollowingRepair/Processing

N/A

Select this reason when the recipient of the goods previously sent you the item for repair; however, they had not previously shipped with FedEx.

Once the return shipment is generated, you can track it through available tracking applications, thus increasing visibility timeframe.

FedEx® Returns solutions provide two methods of processing return labels: FedEx Return Labels and FedEx Return Tags.

-   FedEx Return Label solutions let you either generate Print Return or Email Return labels or use pre-printed labels (Billable Stamps and Ground Package Returns Program).
-   FedEx Print Return label – Create and print a return label, then include it either in the original shipment to your customer or in a separate correspondence. Your customer can then apply this label to the package as needed and drop it off at the nearest FedEx drop-off location.
-   FedEx Email Return label – Email your customers a password-protected [fedex.com](http://www.fedex.com/) URL that they can access to print a return label directly from their computer. The customer receives an email with a link to the label, then prints the label, applies it to the package, and drops it off at the nearest FedEx drop-off location.
-   Printed return labels do not expire and are valid for transportation use anytime. However, if the label is more than 255 days old, then the customer will not be able to track the shipment, even though the label is still usable.
-   FedEx Return Tag solutions (FedEx Express® Tag and FedEx Ground® Call Tag) provide return labels generated by FedEx at the time of package pickup. You arrange for FedEx to create and deliver return shipping labels to your customer and collect the item for return. Your customer simply needs to have the package ready for pickup when the FedEx Express® courier arrives. A shipping label and a customer receipt will be printed on-site.
-   You can also schedule the pickup for FedEx Express; the pickup is on the same day or the next business day, Monday through Friday. FedEx makes one pickup attempt as part of the service.
-   You can also print return instructions to include with your outbound shipments using the Return Instructions Detail.

This section describes how to create and delete FedEx Express return tag requests and how to include a FedEx Express or FedEx Ground return label in your Ship request.

**Global Returns**

FedEx Global Returns program expands the current Returns Product Portfolio by developing a global returns solution across all regions (Asia Pacific, Europe, the Middle East & Africa, Latin America & the Caribbean, U.S. and Canada) and within regions for domestic returns. This will facilitate returns documentation process, providing an outbound/inbound solution and offering a complete bundle of portfolio options. It also supports returns back to the original origin, returns to a new location or an intra-country return, where available.

It provides the ability for a merchant to request an email return label and trade documents for international and non-U.S. Domestic return shipments and make them available to the return shipper. Many of the enhancements introduced also apply to U.S. Domestic Email Return Label shipments, including, but not limited to: Return instructions, Merchant notifications, Merchant documents, and an extended expiration period (2 years).

**FedEx Return Tags**

FedEx creates and delivers a return shipping label to your customer and collects the item for return. Your customer needs to have the package ready for pickup when the FedEx driver arrives. Use the Ship API to create and delete Return Tags for FedEx Express and FedEx Ground shipments.

Before creating a Return Tag for FedEx Express shipments, you can use Express Tag Availability from the Return Tag endpoint to check valid pickup times.

Return Tag Service Details

For FedEx Ground, up to three pickup attempts, and for FedEx Express, one pickup attempt will be made for a Return Tag before being canceled.

The following service details apply to Return Tags.

-   Delivery Area
    -   Available for FedEx deliveries throughout 50 states in U.S.
    -   FedEx Express and FedEx Ground return tag labels are not available for international shipments.
    -   Both commercial and residential locations are allowed.
    -   Domestic returns are also available.
-   Exceptions
    -   No trans-border service to or from Canada and Puerto Rico.
    -   Hazardous Materials in FedEx Ground U.S.
    -   Dry Ice Shipments and Dangerous Goods cannot be shipped.
-   Additional Information
    -   Additional service options include residential pickup.
    -   The maximum declared value is $25,000USD.

For more detailed information about the services offered by FedEx, see the electronic [FedEx Service Guide.](https://www.fedex.com/en-us/service-guide.html)

Return Tag rules

The following details apply for Return Tags:

-   You may request one Return Tag in a single request.
-   You may request up to 99 pieces in a multiple piece Return Tag request.
-   No Ground manifest is required.
-   FedEx® Express Tag shipments can be associated to an outbound shipment via the Return association element.
-   FedEx Ground® Call Tag shipments can be associated to an outbound shipment via the following element:
    -   Customer Reference Type as RMA\_ASSOCIATION and
    -   Customer References Value as the RMA Number

FedEx Print Return Label

FedEx Print Return Label is ideal for retail products, legal documents, pharmaceuticals, and warranty/repair services. Use the Create Shipment endpoint to print a return label and include it in the original shipment to your customer or send it separately. To use the print return label, your customer simply prepares their package for shipping and applies the return label. Then they may tender the FedEx Express® U.S. or international package, or FedEx International Ground® package to FedEx by scheduling a pickup, using a regular scheduled pickup, or visiting a FedEx drop-off location.

In addition, a Returns Material Authorization (RMA) reference number can be included in your ship transaction. The RMA number prints on the labels as barcode and in human readable form when added to the RMA\_Association Reference for a return label. It also prints on your FedEx invoice and can be used to track the return package. FedEx Express, and FedEx Ground return labels are interchangeable, regardless of the original shipping service. For example, you can send the original shipment using a FedEx Express service but include a FedEx Ground return label as part of your packing documents.

FedEx Print Return Label Service Details

The following service details apply to FedEx Express and FedEx Ground return labels:

-   In the U.S., printed return labels are available for FedEx First Overnight®, FedEx Priority Overnight®, FedEx Standard Overnight®, FedEx 2Day®, FedEx 2Day®A.M., FedEx Ground®, FedEx Home Delivery® throughout 50 states in U.S.
-   For international destinations, printed return labels are available for FedEx International First®, FedEx International Priority® and FedEx International Ground®.
-   Additional service options include Saturday Service, Dry Ice Shipments, and Hold at Location.
-   Dangerous Goods and Hazardous Materials cannot be shipped.
-   The maximum declared value is
    -   $1,000USD for FedEx First Overnight, FedEx Priority Overnight, FedEx Standard Overnight, and FedEx 2Day.
    -   $100USD for FedEx Ground and FedEx Home Delivery.

For more detailed information about the services offered by FedEx, see the electronic [FedEx Service Guide](https://www.fedex.com/en-us/service-guide.html).

Alternate Return Address

The Ship API offers an alternate return address option that allows you to override your shipper address and print a different address on the shipping label. For example, if you send a package that is undeliverable, you may use this option to display your returns processing facility address so that FedEx will return the package to that address instead of your shipping facility address.

_Note: The country specified in the Alternate Return Address cannot be different from the origin shipper country._

### Shipment Flow

FedEx follows a step by step process in order to ship the shipments from one place to another. The shipping workflow followed is as below:

**Prepare/Create Shipment**

Create Shipment is the first step in the Shipping flow process. Before shipping products, a shipper must choose which products they require and place the order with a manufacturer. FedEx will provide a ship date stating when the products will be ready for pickup and commercial invoice for the order. It contains information like details of shipment, including the ship date, detailed origin and destination addresses, and the dimensions of package.

If there are any special requirements, such as shipping hazardous goods or dry ice, there are special services offered by FedEx for these purposes.

**Routing**

Routing information helps to create and compute planned routes for field operations. It helps to develop routes that cover all deliveries and pickups to and from numerous customers and find the routes that are most efficient.

**Tracking**

Tracking helps you to monitor your shipments goods which are being transported as per their locations, i.e., previous, current & next location. You will receive information in real time about your package as it moves towards its destination.

You can use shipment special service’s notification event type option to setup and customize the tracking event notifications to be received for a shipment.  
Use notification event type to have FedEx automatically notify you and/or your customer and/or third party. The notifications are sent by email and contain significant shipment events, such as clearance delays, delivery attempts, releases and pre-alerts.  
You can receive email notification for the following events:

-   Shipment being created
-   Estimated delivery
-   Shipment tendered
-   Any exception
-   Shipment Delivery

You are required to specify recipient’s emails with the shipment request and use any or all the notification types if you want an email notification sent to the recipients. This notification is supported for FedEx Express, FedEx Ground, and FedEx Ground® Economy. FedEx also offers a new email notification for Estimated Delivery which triggers an email on the delivery date.  
The key input information associated with this request are as follows:

-   Sender’s Name
-   Email
-   Notification events 

Click here for more information on [Notification Event Types.](https://developer.fedex.com/api/en-us/guides/api-reference.html#notificationeventtypes)

The successful result of this request will initiate notification prompts on the given events and will be sent to the given email address.

**Rating**

When requesting rate quotes, it is important to clarify the details of the shipment. This will include the date, detailed origin and destination addresses, and the dimensions of your shipment. By providing these accurate details you can ensure that you receive the correct quote for your goods. If you have any special requirements, such as shipping hazardous goods, you must make these requirements clear.

**Labeling**

Labels describe and specify what’s inside a package. Shipping labels may differ depending on the carrier you use.

Shipping labels generally include the following information:

-   Origin/return address.
-   Destination address.
-   Package weight.
-   Shipping class.
-   Electronic tracking number and barcode.

### Business Rules

**FedEx Express U.S.**

-   Government-issued photo ID is required at pickup for all FedEx services.
-   FedEx SameDay® City Service is only available for selected cities in Mexico.
-   FedEx Express Saver® service is available throughout all states except Alaska and Hawaii.
-   FedEx 2Day®A.M. service is available throughout all 50 states (Hawaii outbound only).
-   FedEx Express U.S. service is available to 50 States with United States of America. Transit times vary depending on the package destination and the service you choose.
-   Packages up to 70 lbs. can be shipped using FedEx Ground® Economy service.
-   FedEx provides custom packaging for FedEx Express shipments. You may choose to ship using the FedEx® Envelope, FedEx® Pak, FedEx® Box, or FedEx® Tube. You may also ship using your own packaging.
-   Both commercial and residential shipments may be shipped using FedEx Express U.S. services. Residential packages must be identified in your shipping transaction.
-   There are several options available to you for billing the transaction charges. These billing options include Bill Shipper’s FedEx Account, Bill Recipient’s FedEx Account, FedEx Ground® COLLECT, and Bill Third Party’s FedEx Account.
-   The maximum size limit for a FedEx Express U.S. package is 150 lbs. and 119' in length, or 165 total inches in length plus girth (L+2W+2H).

**FedEx Ground U.S. Shipping**

The following rules apply to FedEx Ground U.S. shipping:

-   Shipments can originate from and be delivered to the 50 United States. Delivery between 1 to 7 business days within the contiguous U.S. and between 3 to 7 business days to and from Alaska and Hawaii.
-   FedEx Home Delivery service provides delivery by end of day available to every U.S. residential address Monday to Friday and to most residences on Saturday and many on Sunday.
-   FedEx Ground does not deliver to P.O. boxes. No hazardous materials, except ORM-D and Limited Quantity.
-   FedEx Ground® service is available to every business address in all 50 states (inbound-only service for certain remote locations in Alaska and Hawaii).
-   FedEx Home Delivery® service is available to every U.S. residential address. Packages up to 150 can be shipped using this service.
-   FedEx Ground accepts packages up to 150 lbs. The package dimensions must not exceed 108'' in length or 165'' in length plus girth (L + 2W + 2H).
-   HazMat shipments are allowed with restrictions. No hazardous materials can be shipped to or from Alaska and Hawaii.
-   If the package must be delivered to a business, use FedEx Ground as the service type. If the package must be delivered to a residence, use FedEx Home Delivery as service type.
-   When shipping FedEx Ground U.S. packages, you must enter a valid shipping address for a commercial or business location within the fifty U.S. states.
-   When shipping packages to residential addresses within the U.S., use the FedEx Home Delivery service. FedEx Ground designates FedEx Home Delivery service as the carrier for residential deliveries under 150 lbs.
-   Shipper address and Recipient address for FedEx Ground shipments must contain a U.S. city and state.
-   Do not enter a USPS post office box number as an address for delivery.

_Note: The shipper's account number must be enabled for Ground Residential functionality. Once the account number is enabled, the customer may specify a service type of Ground instead of Ground Home Delivery for a shipment weighing less than 150 lbs. and destined to a residential address._

**International Shipping**

-   Customs clearance is included for shipments services.
-   Package size and weight up to 150 lbs. each; 108'' in length; 130'' in length plus girth (L+2W+2H) for FedEx International Priority, FedEx International Economy and FedEx International First®
-   FedEx International First service provides inbound delivery to select U.S. postal codes from 60 countries in 1 or 2 business days.
-   The following service options are available in FedEx Express International shipping: Alternate Return Address, Commercial Destination Control, Dangerous Goods, FedEx Express International Saturday, Dry Ice Shipments, Delivery Signature Options, FedEx InSight, FedEx International Broker Select®, Mask Account Number (FedEx International Ground), Masked Data, Shipment Notification in the Ship Request and Variable Handling Charges.
-   FedEx 10kg Box or FedEx 25kg Box packaging options are available. The weight limit is 22 lbs. for a FedEx 10kg Box and 55 lbs. for a FedEx 25kg Box. These packaging options are allowed for FedEx International Priority® to more than 220 countries and territories.
-   For FedEx Express International multiple piece shipments (MPS), if one package is a document, then all packages in the shipment must be documents. This is also true for commodity shipments. All the packages must be for commodities. Commodity and Document packages cannot be in the same MPS shipment.

**Domestic Shipping**

-   A contract is required to use FedEx SameDay City service
-   Manual air waybills are not available with SameDay City service. This service is only available for selected cities in Mexico. This is not the U.S. domestic FedEx SameDay service.
-   Before you ship hazardous materials, you must be validated to do so.
-   FedEx Ground service does not include packages over 150 lbs., HazMat packages over 70 lbs., ORM-D/Limited Quantity packages over 66 lbs., packages which exceed 108'' in length or 165'' in length plus girth (L + 2W + 2H) and special accessorial Hold at Location with a HazMat or ORM-D/Limited Quantity shipment.
-   These are not valid C.O.D. payment options: traveler’s checks, credit cards, counter checks, checks endorsed by a third party or checks made payable to FedEx.

**Label Creation**

-   FedEx API allows you to print shipping labels for all shipping types, such as FedEx Express®, FedEx Ground®, and FedEx International Ground® using a variety of thermal label printers.
-   All Thermal labels required for a shipment are generated and returned in a single buffer.
-   Labels may be reprinted by sending the original thermal label buffer to the printer. However, labels should be reprinted only if the original label is damaged or lost before the package is picked up, or as a copy for your records. Duplicate labels applied to packages will cause re-labeling and, in some cases, suspension of your shipping capabilities.
-   Labels that are printed with a laser printer are generated in PDF format and do not need to be scaled or resized.
-   Adobe Reader 6.0 or higher is required to process the label. Printer driver configuration must have printer scaling set to none.
-   Using an HTML wrapper is not necessary for displaying a plain paper PDF label in a browser.
-   Laser labels will not be accepted if they are printed on an ink jet printer. If you are using a color laser printer, the color definition should be set to black, even if the printer only has a black cartridge installed.
-   FedEx returns one laser label per shipping request, with the exception of C.O.D. labels.
-   If you need to print multiple labels (for example, international shipments need additional copies of shipping labels to accompany the customs clearance documentation), you must request additional copies.
-   For all Mexico to Mexico shipments, if no language is specified, the Legal Terms and Conditions will be provided in Spanish.
-   Laser Labels may be reprinted by sending the original PDF to the printer. All the necessary labels are generated by a call to the FedEx Common Label Server (CLS), and CLS returns a single buffer with the exception of the C.O.D. Return labels.
-   The label's human readable content and barcode in the common portion of the label cannot be altered.
-   Ship API provides PNG (Portable Network Graphic) images for FedEx Express, and FedEx Ground labels.
-   4'' x 6'' PNG custom labels should only be used with peel-and-stick label stock.
-   Ink jet printers should not be used because of their inconsistency in creating scannable barcodes.
-   The following conditions need to be followed for shipment creation:

![Tariff_Changes_Updated](/api/content/dam/fedex-com/irc/businessdocimages/Tariff_Scenario_Updated.PNG)

### JSON API Collection

    

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
    
    -   [English](https://developer.fedex.com/api/en-us/catalog/ship/docs.html)
    -   [Spanish](https://developer.fedex.com/api/es-us/catalog/ship/docs.html)