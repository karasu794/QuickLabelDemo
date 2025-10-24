# upload-docs-v1

> Source: https://developer.fedex.com/api/en-bz/catalog/upload-documents/v1/docs.html

                    window.FDX = window.FDX || {}; window.FDX.GDL = window.FDX.GDL || \[\]; var FDX = {}; FDX.contextPath = ""; window.fdx=window.fdx || {}; fdx.context={ envtVar:"", searchUrl:"/services/search", isPublishMode:"true" }; if (!FDX) { var FDX = {}; } FDX.DATALAYER ={}; FDX.GDL = \[\]; FDX.DATALAYER.event=\[\]; FDX.DATALAYER.page = { pageInfo: { pageName: "docs", locale: "en\_bz", language:"en", historicalPageName : "", referrer : "", toolUsage:"", viewPort:"", reportSuite:"", region: "us", country:"bz", pagePath:"apps\\/fdp\\/catalog\\/upload\\u002Ddocuments\\/docs", securePage : "" }, category: { pageType:"", primaryCategory: "", isApplication:"", appName:"" }, onsiteSearch:{ term:"", suggested: "" }, link:{ data:"", type:"" }, button:{ data:"", type:"" }, assetSearch:{ keyword:"", type:"" } }; let country = "bz"; let language = "en"; let pagepath = "apps\\/fdp\\/catalog\\/upload\\u002Ddocuments\\/docs"; let hash = window.location.hash; let pageId = country.toUpperCase().concat("/", language).concat("/", pagepath).concat("", hash).replace("#", ""); window.FDX.GDL.push(\[ 'event:publish', \[ 'page', 'pageinfo', { pageId: pageId } \] \]); FDX.DATALAYER.googleAPIFlag=false; FDX.DATALAYER.inputField=''; FDX.DATALAYER.userType=""; FDX.DATALAYER.locationApp = { googleAPIFlag: "", };    (function(g,b,d,f){(function(a,c,d){if(a){var e=b.createElement("style");e.id=c;e.innerHTML=d;a.appendChild(e)}})(b.getElementsByTagName("head")\[0\],"at-body-style",d);setTimeout(function(){var a=b.getElementsByTagName("head")\[0\];if(a){var c=b.getElementById("at-body-style");c&&a.removeChild(c)}},f)})(window,document,"body {opacity: 0 !important}",3E3);  window\['adrum-start-time'\] = new Date().getTime(); (function(config){ config.appKey = $("#templateConfig").val(); config.adrumExtUrlHttp = 'http://cdn.appdynamics.com'; config.adrumExtUrlHttps = 'https://cdn.appdynamics.com'; config.beaconUrlHttp = 'http://pdx-col.eum-appdynamics.com'; config.beaconUrlHttps = 'https://pdx-col.eum-appdynamics.com'; config.xd = {enable : false}; })(window\['adrum-config'\] || (window\['adrum-config'\] = {})); 

true

![Fedex Logo](/api/content/dam/fedex-com/irc/leftnav/white.png)  

         

    

 [![ Sign Up or Log In](/api/content/dam/fedex-com/irc/leftnav/login-icon_white.svg) Sign Up or Log In](#)

* * *

[](https://www.fedex.com/en-us/developer.html)

-   [IRC](/content/fedex-com/irc.html) 
-   [United States English](/content/fedex-com/irc/sites/bz/en_bz.html) 
-   [Catalog](https://developer.fedex.com/api/en-bz/catalog.html) 
-   [Trade Documents Upload API](https://developer.fedex.com/api/en-bz/catalog/upload-documents.html) 
-   Trade Documents Upload API Documentation 

# 

### Introduction

Trade Documents Upload API is an international FedEx shipping document upload solution that simplifies your global shipping needs and allows you to electronically upload customs documentation required for international shipments. You can submit most of your trade documents electronically relieving yourself from printing or attaching trade documents with the shipment.

The customs and other agencies receive electronically sent documents faster than paper copies attached with your shipment. The customs clearance process is also optimized as capturing and sharing of critical trade information is done at earlier stages of shipping.

_Note:_

-   _In certain scenarios, the originals of specific international documents still need to be attached to the package. For more information, refer section [Export Documents](https://developer.fedex.com/api/en-bz/guides/api-reference.html#exportdocuments)._
-   _For smooth customs clearance and to avoid delays, ensure that the documents are visually clear and not distorted in any way._

### Trade Documents Upload API Details

Upload your customs documents or use FedEx-generated trade documents. You can also customize the FedEx generated electronic trade documents by uploading your Company Letterhead/Logo and Digital signature image. Uploading documents electronically eliminates the need for manual signing, folding, stuffing and attaching customs documents to each shipment. Additionally, saves on paper, energy and printing costs.

Following are the features associated with this API:

**Upload Document**

You can upload one document at a time before creating the shipment (pre-shipment) or after a shipment is created using Ship API (post-shipment).

_Note: Creation of shipment mentioned throughout is applicable to Ship API- Create Shipment, Open Ship API- Create Open Shipment and Freight LTL API- Ship Freight LTL endpoints._

**Upload Multiple Documents**  

You can upload maximum of five documents per upload request for both pre-shipment and post-shipment conditions.

**Upload Multiple Encoded Documents**  

You can upload base64 encoded documents (up to five) at once before creating the shipment (pre-shipment) or after a shipment is created (post-shipment). The documents uploaded using this option provides additional security to the document data in case of an unlikely interception.

**Upload Images**  

This feature allows you to upload customized Company Letterhead/Logo and Digital signature images which can be used in the FedEx generated paperwork or reports. First, upload the Company Letterhead/Logo and Digital signature image to the FedEx Servers and then provide these upload references in your shipment request (Create Shipment endpoint) for individual document using element _customerImageUsages_ under _shippingDocumentSpecification_.

Digital Signatures or Letterheads/Company Logos are printed on the following FedEx generated documents and reports:

-   Commercial Invoice
-   Certificate of Origin
-   OP900
-   Pro Forma Invoice
-   USMCA Certificate of Origin
-   USMCA Commercial Invoice and Certificate of Origin

_Note:_

-   _Digital Signature – The limitation for signature is 240x25 pixels and the images can be in GIF, PNG formats._
-   _Company Letterhead/Logo – The limitation for Logo is 700x50 pixels and images can be in GIF, PNG formats._

### Trade Document Upload API Workflow

Following is the flow that can be used to upload document in a Pre-Shipment or Post-Shipment scenarios.

**Pre-Shipment Document Upload:**

Pre-shipment document upload involves uploading the document(s) using this API before a shipment is created. After successful upload of document(s), you can later associate the uploaded document(s) reference in the shipment request.

This is the standard method to upload your trade documents prior the shipment being confirmed.

The steps to perform a pre-shipment document upload are as follows:

-   Use any of the following endpoints as per your requirement
    -   Upload Document
    -   Upload Multiple Documents
    -   Upload Encoded Documents
-   Provide workflowName value as ETDPreShipment to indicate it is a Pre-shipment upload.
-   Provide the actual file(s) or base64 encoded document(s) to be uploaded.  
    
-   Provide document details (Commercial Invoice, Certificate of Origin, Export Declaration. etc), which includes document type, and shipment metadata associated with the document.
-   Successful request will upload the documents to FedEx servers and return unique identifier i.e. **_docId_** for each uploaded document as success token.  
    
-   Use Create Shipment/Create Open Shipment/Ship Freight LTL endpoint.
-   In the Shipping end point per your selection, provide shipmentSpecialService/specialServiceTypes as ELECTRONIC\_TRADE\_DOCUMENTS and pass _docId_ value(s) to the element shipment SpecialServices/etdDetail/attachedDocuments/documentId.
_Note: For multiple-piece shipment (MPS), specify the **docId** generated from uploading documents for all the packages in the shipment._-   Successful shipment request will confirm the ETD shipment to FedEx and generate tracking & label details and the _completedEtdDetail_ object will return the uploaded document type and document(s) id as a reference.
-   For Pre-shipment document upload, you can upload all the documents one at a time or up to 5 documents together, and then provide all documents IDs to the shipment at once.

**Post-Shipment Document Upload (PSDU):**

Post-shipment document upload (PSDU) allows you to upload document(s) after the shipment is submitted and tracking labels are generated. In this scenario, once the shipment is created and tracking number is generated, associate this tracking number in your document upload request.

This method is convenient for customers who create their own Commercial Invoices and have third-parties or remote offices creating customs documentation.

Following are important points to remember when you use this method:

-   You should have shipment tracking number and shipment date ready prior to the upload request.
-   You should be aware of the shipper’s location CUT-OFF times to submit the documentation in due time.

This API also supports submitting customs document for future day shipments, as well as current day shipments.

The steps to perform a post-shipment upload are as follows:

-   Use _Create Shipment/Create Open Shipment/Ship Freight LTL_ endpoint.
-   In the Create Shipment end point, specify the below details as per your selection,
    -   Provide _shipmentSpecialServices/specialServiceTypes_ as ELECTRONIC\_TRADE\_DOCUMENTS.
    -   Provide _shipmentSpecialServices/etdDetail/attributes_ as POST\_SHIPMENT\_UPLOAD\_REQUESTED.
-   Successful shipment request will confirm the shipment to FedEx and generate tracking & Label details.
-   Use any of the following endpoints as per your requirement.
    -   Upload Document
    -   Upload Multiple Documents
    -   Upload Multiple Encoded Documents.
-   Provide _workflowName_ value as _ETDPostShipment_ to indicate it’s a Post-shipment upload.
-   Provide the actual file(s) or base64 encoded document(s) to be uploaded.
-   Provide document details (Commercial Invoice, Certificate of Origin, Export Declaration, etc).
-   Provide already processed shipment _trackingNumber_ and _shipmentDate_ under the element _document/meta/trackingNumber_ and _document/meta/shipmentDate_.  
    _Note: For multiple-piece shipments (MPS), use the master shipment tracking number when uploading the documents. The ETD details provided for the parent shipment are also applicable for the child shipment._
-   Successful request will upload the documents to FedEx servers and associate the uploaded documents with the shipment

The following are the features of Trade Document Upload API which allows you to upload documents and images relevant to the shipment documentation.  

### How Trade Documents Upload API Works

The following are the features of Trade Document Upload API which allows you to upload documents and images relevant to the shipment documentation

**Upload Document**  

Use this endpoint to upload the trade documents for both Pre-shipment and Post-shipment condition.  

Following are the required input information associated with this request:

-   **attachment** – Actual file to be uploaded.
-   **workFlowName** – Provide ETDPreShipment for Pre-shipment upload and ETDPostShipment for Post-shipment upload.
-   **document** – Provide document details and shipment meta data.
-   **trackingNumber** – Provide PSDU shipment tracking number for which the documents to be uploaded. This is optional for Pre-shipment upload.
-   **shipmentDate** – This is shipment date. This is optional for Pre-shipment upload.

For Pre-shipment upload, the successful response will upload the document to FedEx Servers and return _docId_. This _docId_ will be used in the actual shipment to submit shipment and generate labels.

For Post-shipment upload, the successful response will upload the document to FedEx Servers and associate the uploaded documents with the already confirmed shipment.

**Upload Image**  

Use this endpoint to upload custom signature and letterhead images/company logo, which can then be applied on the shipping documents.  

The following are required input information associated with this request:

-   **attachment** – This is an image file.
-   **document** – Provide image details such as file name, content type, and file meta data.

The successful request will upload signature and/ letterhead images/Company Logo into FedEx Servers and return _imageIndex_. This index is then passed in your shipment request for individual document element _customerImageUsages_ under _shippingDocumentSpecification_ to ensure the custom images or letterhead is printed on the shipment document.

### Upload Multiple Documents

Use this endpoint to upload trade documents (up to five) for both pre and post shipment conditions. Following are the required input information associated with this request:

-   **workflowName** – Provide _ETDPreShipment_ for Pre-shipment upload and _ETDPostShipment_ for post-shipment upload.
-   **fileName** – Provide the names of the documents or file being updated along with the extension type. Example: COD.PDF
-   **contentType** – Provide the file type and format to be uploaded from the available options.
-   **shipDocumentType** – Provide the types of documents to be uploaded.
    
    For more information on the individual documents, refer to the [Upload Documents](#updoc) section on this page. Here is the list of document types you can choose from:
    
    -   CERTIFICATE\_OF\_ORIGIN COMMERCIAL\_INVOICE
    -   ETD\_LABEL
    -   USMCA\_CERTIFICATION\_OF\_ORIGIN
    -   USMCA\_COMMERCIAL\_INVOICE\_CERTIFICATION\_OF\_ORIGIN
    -   OTHER
    -   PRO\_FORMA\_INVOICE
-   **carrierCode** – Provide the four letter code of the FedEx operating company. Example: FDXE
-   **originCountryCode** – Provide origin country code for the shipment.
-   **destinationCountryCode** – Provide destination country code for the shipment.
_Note: Refer the [_Reference Guide_](https://developertest.fedex.com/api/en-us/guides/api-reference.html#countrycodes) to search your country code. Example: US_-   **shipmentDate** – For post-shipment upload, provide the actual shipment date.
-   **trackingNumber** – For post-shipment upload, provide the shipment tracking number. Example: 7825XXXXXXX.

For Pre-shipment upload, the successful response will upload documents to FedEx Servers and return document Ids _(docId)_. This _docId_ will be used in the actual shipment to submit shipment and generate labels.

For Post-shipment upload, the successful response will upload documents to FedEx Servers and associate the uploaded documents with the already confirmed shipment.

### Upload Multiple Encoded Documents

Use this endpoint to upload base64 encoded trade documents (up to five) for both pre and post shipment conditions.

Following are the required input information associated with this request:

-   **workFlowName** – Provide _ETDPreShipment_ for Pre-shipment upload and _ETDPostShipment_ for Post-shipment upload.
-   **carrierCode** – Provide the four-letter code of the FedEx operating company. Example: FDXE
-   **contentType** – Provide the file type and format to be uploaded from the available options.
-   **shipDocumentType** – Provide the types of documents to be uploaded.
    
    For more information on the individual documents, refer to the [Upload Documents](#updoc) section on this page. Here is the list of document types you can choose from:
    
    -   CERTIFICATE\_OF\_ORIGIN COMMERCIAL\_INVOICE
    -   ETD\_LABEL
    -   USMCA\_CERTIFICATION\_OF\_ORIGIN
    -   USMCA\_COMMERCIAL\_INVOICE\_CERTIFICATION\_OF\_ORIGIN
    -   OTHER
    -   PRO\_FORMA\_INVOICE
-   **originCountryCode** – Provide origin country code for the shipment.
-   **destinationCountryCode** – Provide destination country code for the shipment.
_Note: Refer the [_Reference Guide_](https://developertest.fedex.com/api/en-us/guides/api-reference.html#countrycodes) to search your country code. Example: US_-   **fileContentBase64** – Specify the bytecode content for the base64 file to be uploaded.

For Pre-shipment upload, the successful response will upload encoded documents to FedEx Servers and return document Ids _(docId)_. This _docId_ will be used in the actual shipment to submit shipment and generate labels.

For post-shipment upload, the successful response will upload encoded documents to FedEx Servers and associate the uploaded documents with the already confirmed shipment.

### Upload Documents

Following are the documents that can be submitted with this API:  

**Certificate of Origin (COO)**  

A COO is an international document that verifies the country/territory where a product was manufactured. Some countries restrict imports from certain countries, many countries limit the quantity of imported goods, and some countries give preference to goods manufactured in a certain country.  

**Commercial Invoice (CI)**  

This is a document provided by the seller/exporter that describes the parties involved in the shipping transaction and the goods being transported. It is the primary document used by Customs. It should be prepared using the official language of the country/territory to which the goods are being exported, if possible. The Commercial Invoice should include a detailed breakdown of all items included in the shipment, including: a proper description of the goods (what is it? what is it made from? what is its intended use?) the quantity, the country/territory of manufacture, the price or cost, currency used, the Harmonized System number for each commodity and the terms of delivery. Some countries require that an original invoice be executed on the shipper's letterhead. The invoice should always be signed and dated by the exporter certifying that the details provided are true and correct representations of the contents covered by the Commercial Invoice.  

For more information, visit our [Global Trade Manager](https://www.fedex.com/GTM).

**ETD LABEL**

This is Shipment label generated in the Shipment with ETD special service with Post-Shipment document upload criteria. This label can also be uploaded with the shipment along with other paperwork.

**Pro Forma Invoice**

The pro forma invoice is issued before sales take place. Once receiving pro forma invoice from the supplier, the buyer sends a purchase order or opens a letter of credit to the supplier. As per agreed date of shipment, the seller arranges to ship the goods.

**USMCA Commercial Invoice and Certification of Origin**

A USMCA Certification of Origin (COO) is required for goods that qualify for reduced or duty-free entry as a product of one of the three UNITED STATES-MEXCIO-CANADA AGREEMENT (USMCA/T-MEC/CUSMA) participants: Canada, Mexico and the U.S. The certification is completed by the exporter or manufacturer of the goods.

**USMCA Certification of Origin**

A USMCA Commercial Invoice and Certification of Origin (COO) is required for goods that qualify for reduced or duty-free entry as a product of one of the three UNITED STATES-MEXCIO-CANADA AGREEMENT (USMCA/T-MEC/CUSMA) participants: Canada, Mexico and the U.S. The certification is completed by the exporter or manufacturer of the goods and is provided with the Commercial Invoice.

**Other**

The following section describes some of the common documents which are classified under other documents. These documents are not mandatory to be uploaded for a shipment, but may be required for customs clearance of your individual shipment. This may vary based on the type of shipment, origin, destination and other factors.

-   **Packing List**

A Packing List is required if there is more than one package under one air waybill or if the shipment weighs more than 100 kgs. Please note that this requirement may differ between markets based on the commodities being shipped. The list must correctly and clearly describe the goods, quantity and weight.

-   **FCC 740 Statement Regarding the Importation of Radio Frequency Devices Capable of Causing Harmful Interference**

The Federal Communications Commission (FCC) 740 form is required while shipping electronics with radio frequency devices which can cause harmful interference. The form involves details such as Device Model/Type Name, Harmonized Tariff Number, Manufacturer's Name and Address, Consignee's Name and Address and Importer's Name and Address.

-   **Video-Film Declaration**

The video film declaration: This document is submitted to declare that the film/video that is shipped contains no obscene or immoral matter, nor any matter advocating or insurrection against the United States. The document involves details such as Length of Film/Video, Duration of Film/Video and Brief Synopsis of Content.

_Disclaimer: Above information subjected to change._

The Other documents are only uploaded based on countries, products and other special custom document. To view a list of many other commonly used documents click [Export Documents](https://developer.fedex.com/api/en-bz/guides/api-reference.html#exportdocuments).

### Customs Documents and Requirements

Accurate documentation is an important element of domestic and international shipping. Each country has specific laws and regulations around international shipping. For U.S. export shipping, the U.S. and destination countries require different types of regulatory documents.

_Note: Shipments requiring documentation in addition to the FedEx International Air Waybill, the FedEx International Next Flight Air Waybill or the FedEx International Mail Service Air Waybill (e.g., a Commercial Invoice) may require additional transit time._

**Controlled Commodities**

When shipping the following commodities internationally, check to ensure that they are accepted by your chosen FedEx service for delivery to the destination country and city:

-   Dangerous Goods
-   International Traffic in Arms Regulations(ITAR)
-   Dangerous Goods in Excepted Quantities.  
    _Note: In order to ship Dangerous Goods in Excepted Quantities, use the special service option SMALL\_QUANTITY\_EXCEPTION._
-   Excepted Package Radioactive

__Disclaimer: Above information subjected to change, and for more information Go to [Service Guide](https://www.fedex.com/en-us/service-guide.html) or reach out to your FedEx representative.__

**Export declaration for Canada outbound shipments**

Export declaration is required by the Canada Border Services Agency (CBSA) to report exports from Canada, for the following conditions.

-   All Canada outbound shipments containing non-restricted goods when the commercial goods are valued at $2,000 Canadian Dollars or more and the destination of the goods is a country other than the United States, Puerto Rico, or the United States Virgin Islands.
-   All Canada outbound shipments which contain controlled, restricted, or regulated goods regardless of value.

Carriers must obtain the proof-of-report number from the exporter before any goods leave Canada. An exporter is required to submit the export declaration before providing the proof-of-report number to the carrier.

**Electronic Export Information (EEI)**

EEI is the electronic export data filed in the Automated Export System (AES) using AESDirect in the Automated Commercial Environment (ACE). The ACE Secure Data Portal (ACE Portal) is a centralized access point for the trade community to connect with U.S. Customs and Border Protection (CBP).

EEI is the equivalent electronic version of the Shipper’s Export Declaration (SED), Department of Commerce (Census Bureau) form 7525-V, which can no longer be submitted to the U.S. Government. The EEI provides export statistics and control by reporting all pertinent export data of an international shipment transaction.

The EEI is mandatory and must be submitted electronically by the exporter or agent through the Automated Export System (AES) for commodities listed on the Commerce Control List (CCL).

If the shipment is originated from U.S, U.S. Virgin Islands or Puerto Rico to the destination country China, Russia, Venezuela and Hong Kong, irrespective of the shipment value, you must provide the following information:

-   An EEI filing Internal Transaction Number (ITN)
-   The correct Export Control Classification Number (ECCN) or EAR99 classification number for each item, or
-   An applicable filing exemption

Exemptions are allowed if the shipment

-   Is eligible for License Exception GOV
-   Is eligible for exceptions in the Export Administration Regulations and Foreign Trade Regulations (FTR), or
-   Consists only of items that are classified as EAR99

__Note: For other destinations, you are required to file an EEI for all U.S. export shipments if one or more commodities (Schedule B number) total more than $2,500 USD in the consolidated shipment on any given day.__

**Shipper's Letter of Instruction (SLI)**

An SLI captures international shipment information for the U.S. customers.

__Note:__

_-   _Customs clearance is included for shipments to Canada through our brokerage-inclusive service. A fee is applicable. Brokerage-inclusive service may not be available with all electronic shipping solutions.__

FedEx International Ground® parcel distribution service allows FedEx Ground® to consolidate FedEx International Ground® shipments into one unit that is cleared and handled as one customs entry with a single broker entry _fee._

### Trade Document Upload API Benefits

Following are some of the benefits associated with the Trade Documents Upload API/Feature:

-   Fewer customs clearance issues reduce customs delays, which increases shipping reliability and the seller's reputation.
-   More time to build the business improves company productivity and profit by eliminating the need to print and match multiple copies of paperwork to individual packages.
-   Allows adding a company letterhead and signature image to the FedEx-generated Commercial Invoice or Pro Forma Invoice.
-   Gain additional time to resolve issues with customs documents, such as missing information, before shipment arrival.
-   Allows to submit your Commercial Invoice electronically for FedEx International Ground shipments to Canada.
-   Submit customs documents to FedEx for future-day shipments or any date from today’s date to 10 days in the future.
-   Increased peace of mind; commodity information is not revealed to third parties because invoices are not on packages.
-   Lowers the carbon footprint by lowering consumption of paper, toner, shipping materials and usage of printers.
-   Reduce the chance of shipment thefts, since there are no invoices on the package and commodity information isn’t revealed to third parties.
-   Saves time and reduces errors when you ship internationally.
-   This upload document feature can be used for both import and export shipments. View the [list of available countries](https://www.fedex.com/content/dam/fedex/us-united-states/services/Commercial_Invoice_Country_List.pdf) to see whether uploading documents is accepted in the countries you ship to/from.
-   You can prepare, store and reuse uploaded documents online with the FedEx Document Preparation Center and the [International Document Help section.](https://www.fedex.com/GTM)

### **Business Rules**

Following are some of the important business rules associated with the Upload Document API/Feature:

-   The valid file types for uploading documents are PDF, TXT, PNG, JPG, GIF, BMP, TIF, RTF, DOC, DOCX, XLS and XLSX.
-   The documents may be uploaded a maximum of 10 days before shipment.
-   Each uploaded trade document or image cannot exceed 5 MB.
-   For Digital Signature image, the limitation is 240x25 pixels and the images can be in GIF, PNG formats.
-   For Company Letterhead/Logo, the limitation is 700x50 pixels and images can be in GIF, PNG formats.
-   Letterhead image may not be acceptable for all origin/destination locations based on customs regulations.
-   The images will be uploaded as is and no correction is provided by FedEx.
-   Customs documentation can be electronically uploaded with the following special handling and service options:
    -   Dry Ice
    -   Dangerous Goods
    -   Hazardous Materials
-   Required for TPC (Third Party Consignee) shipments originating in the United States (U.S.), Asia Pacific, Canada (CA) and European Union (EU) countries wherever Upload is enabled.
-   All shipments with electronic documents must be created, uploaded and picked up on the requested shipping day.
-   When using PSDU(Post-Shipment Document Upload), be sure to upload the document(s) prior to package pickup.

     

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
-   [FedEx.com](https://www.fedex.com/en-bz/home.html)
-   [Terms of Use](https://www.fedex.com/en-bz/terms-of-use.html)
-   [Security & Privacy](https://www.fedex.com/en-us/trust-center.html)

-   ![](/api/content/dam/fedex-com/irc/leftnav/globe.png)
-   Belize-   English
    
    -   [English](https://developer.fedex.com/api/en-bz/catalog/upload-documents/docs.html)