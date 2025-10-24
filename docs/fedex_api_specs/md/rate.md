# rate

> Source: https://developer.fedex.com/api/en-us/catalog/rate.html

-   [Details](#/api)
-   [Change Log](#/api)

[](javascript:void\(0\))[](javascript:void\(0\))

Overview

This API returns estimates for account-specific FedEx rates or FedEx standard list rates for all services available for the origin/destination pair provided, along with estimated cost of shipping with discounts, surcharges, fees and other factors that can affect your shipping rates. This API returns rate estimates for a specific service, operating company or all available services.

**Supported Services:** 

Package shipments (FedEx Express®, FedEx Ground, FedEx Ground® Economy  and FedEx Freight®).   
Refer to [LTL Freight API](https://developer.fedex.com/api/en-us/catalog/ltl-freight.html) to manage Less-Than-Truckload Freight shipments (FedEx Freight®).

VERSION

V0

LAST UPDATED

07/27/2020

This API returns estimates for account-specific FedEx rates or FedEx standard list rates for all services available for the origin/destination pair provided, along with estimated cost of shipping with discounts, surcharges, fees and other factors that can affect your shipping rates. This API returns rate estimates for a specific service, operating company or all available services.

**Supported Services:** 

Package shipments (FedEx Express®, FedEx Ground, FedEx Ground® Economy  and FedEx Freight®).   
Refer to [LTL Freight API](https://developer.fedex.com/api/en-us/catalog/ltl-freight.html) to manage Less-Than-Truckload Freight shipments (FedEx Freight®).

* * *

### Key Features

![Rate ship icon](/api/content/dam/fedex-com/irc/apis/icon_rate_ship.svg)

Shipment rates for your origin and destination

Rates are available for any combination of services and origin/destination pairs that are currently serviceable by FedEx.

![Clock icon](/api/content/dam/fedex-com/irc/apis/icon_clock.svg)

Transit Time  
  
Time in transit may be returned along with rates if it is specified in the request.

![Supplies icon](/api/content/dam/fedex-com/irc/apis/icon_supplies.svg)

Special services

Get account-specific rates for special services like alcohol or dangerous goods. View the [FedEx Service Guide](https://www.fedex.com/en-us/service-guide.html) for additional information.

[](javascript:void\(0\))[](javascript:void\(0\))

[](javascript:void\(0\))[](javascript:void\(0\))

### August 18, 2025 Change Log:

-   Previously, on-call pickup rates were applied per shipment. From now onwards, these rates will be charged per pickup stop. For regularly scheduled, automated pickups, charges will now be applied weekly, based on the number of selected pickup days, regardless of the service type. It's important to note that surcharges, waivers, and discounts can still be applied to both single on-call and weekly pickup charges.

\* Applicable only to the U.S (Not applicable for Puerto Rico, and any other US territory) and CA.

-   A new optional object _processingOptions_ is introduced in the request schema to receive on call pickup rates charged at per stop. Previously, the on-call surcharges were displayed by default in the response but now you must specify the value for the _processingOptions_ to view the pickup rates.
-   A new _pickupDetail_ object is added under requestedShipment object. The requestType field under the new _pickupDetail_ object supports two values: FUTURE\_DAY and SAME\_DAY. If you plan to schedule a pickup for a future date, set the requestType field to FUTURE\_DAY, and provide details for the following two fields to get accurate pickup rate quotes back.
    -   requestedShipment.pickupDetail.readyDateTime
    -   requestedShipment.pickupDetail.latestPickupDateTime

### January 13, 2025 Change Log:

-   New Surcharges introduced:
    
    -   MONITORING\_AND\_INTERVENTION surcharge is introduced that will be applicable to all MI and HCID related services.
    -   A US Inbound Processing Fee is introduced that will be applicable to all US Inbound international shipments (Express and Ground). This processing fee is NOT applicable for shipments from Puerto Rico to U.S, U.S to Puerto Rico, and U.S. origin shipments.
    
-   Surcharges Revised/Updated:
    -   Additional Handling Surcharge: All U.S. and international packages that meet the criteria of Additional Handling Surcharge – Dimension will be subject to a 40-lb. (18 kg) minimum billable weight.
    -   ANCILLARY\_FEE: This surcharge will be applicable to all U.S. inbound international shipments (Express and Ground) as part of the Custom Border Patrol Fee or U.S. Inbound Processing Fee.

### July 15, 2024 Change Log:

The Dangerous Goods (DG) by Road special services allow shippers to ship their dangerous goods via road within key European markets. New **_standaloneBatteryDetails_** element is introduced as part of the DG by Road initiative under **_packageSpecialServices_** object.  
Under the DG by road initiative in Europe, below new package level special service options are introduced:

-   Standalone Lithium battery shipments
-   Fully Regulated DG by Road
-   Limited Quantity Shipments by Road
-   Genetically Modified (Micro) Organisms
-   Biological Substances Category B
-   Excepted Quantities
-   Radioactive Materials

The surcharges that are applicable for dangerous goods are also applicable for the above DG by road services.

### April 15, 2024 Change Log:

Now the additional handling surcharge and the oversize surcharge will be applicable at package level as well. Whenever charges are rated at package level, in the ship and rate quote response, enhanced package level details are displayed along with aggregated shipment level charges. Below are the surcharges that will be applied at the package level.

-   AHS Packaging
-   AHS Dimension
-   AHS Weight
-   Oversize
-   AHS Freight Dimension
-   Non-Stackable

These surcharges will be applicable at the package level for the below services:

-   All International Express MPS
-   All International Freight Express MPS
-   All IPD CRNs
-   All IDF CRNs
-   All Express services supporting Parcel MPS packages and Express Freight MPS in Intra CA/MX region.

New Surcharges are introduced for non-U.S. markets. These surcharges will be applied to the shipments based on their package rated weight, piece count and additional security measures. The new surcharges are rated at shipment level. The surcharges are:

-   High Density
-   Enhanced Security
-   Single Piece

### February 19, 2024 Change Log:

New Monitoring and Intervention (MI), and Healthcare Identifier (HCID) special service options are introduced. The MI special services option can be selected at the shipment level under **_shipmentSpecialServices_** object, and HCID special services can be selected at the package level under the **_packageSpecialServices_** object while creating the rate quote request.

### July 17, 2023 Change Log:

FedEx Ground Economy transit time request now returns a confirmed date and specific transit days instead of a range of days.

### April 14, 2023 Change Log:  

A new overweight surcharge and a flat rate per pack rating option is introduced for the global non-U.S. domestic markets to provide flexible support to their pricing and rating requirements.

-   Flat rate per pack allows FedEx to charge customers based on the piece count for a package.
-   The overweight surcharge is calculated at shipment level as rate per kilogram, for each additional kilogram over the threshold.

### December 09, 2022 Change Log:

A new Remote Area Surcharge (RAS) is introduced for select contiguous U.S. zip codes. In addition to Delivery Area Surcharge (DAS) and Extended Delivery Area Surcharge (EDAS), FedEx will also charge Remote Area Surcharge (RAS) to package shipments destined to select continental U.S. zip codes. Descriptions are updated for the **Delivery\_Area** Enum as:

-   Delivery Area Surcharge Remote Residential
-   Delivery Area Surcharge Remote Commercial

### April 22, 2022 Change Log:

Updated element description of element "_**description"**_ –  
The element _**output/rateReplyDetails/ratedShipmentDetails/ratedPackages/surcharges/description**_ now displays delivery and returns information in the response for the type DELIVERY\_CONFIRMATION surcharges for the FedEx Ground® Economy services.

### Feb 19, 2022 Change Log:

The API now returns **_FedEx Priority Alert_** and **_FedEx Priority Alert Plus surcharges_** in the response.

### Jan 15, 2022 Change Log:

**Tier addition to ODA/OPA Surcharges:**

Following new ODA/OPA Tiered surcharge descriptions are returned in response element _shipmentLegRateDetails/surchanges_/_description_.

-   Out of Delivery Area Tier A
-   Out of Delivery Area Tier B
-   Out of Delivery Area Tier C
-   Out of Pickup Area Tier A
-   Out of Pickup Area Tier B
-   Out of Pickup Area Tier C

[](javascript:void\(0\))[](javascript:void\(0\))

[](javascript:void\(0\))[](javascript:void\(0\))

[](javascript:void\(0\))[](javascript:void\(0\))

[](javascript:void\(0\))[](javascript:void\(0\))