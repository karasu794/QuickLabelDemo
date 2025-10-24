# get-started

> Source: https://developer.fedex.com/api/en-us/get-started.html

Select to get started.

Which of the following best describes your business?

Select user

![](/api/content/dam/fedex-com/irc/leftnav/dropdownimg.png) ![](/api/content/dam/fedex-com/irc/angular/ic-status-help.svg)

-   [FedEx Shipper](#)
-   [FedEx Compatible Provider](#)
-   [Non-Compatible Provider](#)

-   **FedEx Shipper:** Company who integrates FedEx APIs into their own applications.
-   **FedEx Compatible Provider:** Company validated by the FedEx Compatible program who integrates with FedEx APIs to build a solution, application or plugin that can be sold and/or distributed to an external organization.
-   **Non-Compatible Provider:** Company who integrates with FedEx APIs to build a solution, application or plugin that can be sold and/or distributed to an external organization.

[EXPAND ALL](javascript:void\(0\)) [COLLAPSE ALL](javascript:void\(0\))

[1 Create or join an organization Created with Sketch.](#10)

![info-icon](/api/content/dam/fedex-com/irc/common/Information.svg)

Prerequisite

You must have a FedEx user ID to log into the FedEx Developer Portal and create an organization.

  
Either create an organization, if one does not yet exist for your company, or join your company’s existing organization.

Create a new organization

To create your own organization, click on **Create Organization** in the left-hand navigation. If you create an organization, you will automatically be listed as the admin of that organization.

-   An admin can invite users to join their organization, assign them to roles (e.g. contributor or viewer) and projects, and can manage shipping accounts.
-   To learn more about these roles, explore our [Organization Administration Guidelines](https://developer.fedex.com/api/en-us/guides/organization.html "org-guides").

**Provide organization information**

Provide your company name, website URL and create an organization name. Give your organization a name that other users will recognize. This name can be used to organize your company into more specific groups (e.g. department, division, region, location) or can be the same as your company name.

Once you have created your organization, as the admin you can click **Manage Organization** in the left-hand navigation to enter more details.

**Add a shipping account**

Open the **Shipping Accounts** tab. Click the **Add Account** button.

1.  Enter your existing FedEx account number, account nickname, and billing address associated with the account. We will validate the billing address to be sure it matches the account details to prevent fraudulent activities. If you do not have an existing FedEx account, [open a new account](https://www.fedex.com/en-us/open-account.html "account") or contact your FedEx customer representative.
2.  Accept the [End User License Agreement](https://developer.fedex.com/api/en-us/legal/eula.html) or send it to someone within your company who has the authority to accept the agreement.

**Add a billing account**

Open the **Billing Accounts** tab. Click the **Add Billing Account to your Organization** button.

1.  Enter your existing FedEx account number, account nickname, and U.S.-based billing address associated with the account. We will validate the billing address to be sure it matches the account details to prevent fraudulent activities. If you do not have an existing FedEx account, [open a new account](https://www.fedex.com/en-us/open-account.html "account") or contact your FedEx customer representative. Billing accounts must be based in the U.S.
2.  Accept the [End User License Agreement](https://developer.fedex.com/api/en-us/legal/eula.html) or send it to someone within your company who has the authority to accept the agreement.

**Invite users**

An admin can invite users to their organization and assign them to roles and projects. Open the **Users** tab. Click the **Add Users** button.

1.  Select a user role: Viewer, Contributor or Admin.
2.  If you have any existing projects, assign a project to the user. You can also assign users to projects under any Project overview page.
3.  Enter the email addresses of the users you want to join your organization under the selected role.

[Create an Organization ![](/api/content/dam/fedex-com/irc/leftnav/read_more_check_arrow.png)](https://developer.fedex.com/api/en-us/organization/create.html#/createorganization) 

Join an existing organization

**Step 1: Ask the admin of your organization to send you an invite.**

If your company has already created an organization, ask the admin of the organization to invite you to join. You will have 24 hours to accept their invite. If you miss this window of time, you can always ask them to resend it.

**Step 2: Accept the invite.**

To accept the invite, you will need to either log in with your existing user ID and password or, if your existing user ID is already associated with an organization, you will need to create a new one.

[2 Create a project Created with Sketch.](#12)

Create an API project

Visit the **My projects** page and open the **APIs** tab. Click the **Create API Project** button.

**Step 1: Select the API(s) you want to include in your project**

Review the API quotas, rate limits, and API validation details.

**Step 2: Configure project details**

-   Give your project an identifiable name that is unique to your organization.
-   Select any countries you plan to ship within so that we can assign you a test shipping account. To test shipping packages domestically within a European country, you must have a separate test account for each country. You can always add/remove countries later.
-   To get notified about the latest API updates and any outage related information, set your notification preferences.

**Step 3: Read and accept terms, including the FedEx Developer Portal License Agreement**

Once you accept the terms and click the Create button, you will see a confirmation screen. You can then view your test credentials within your new project.

* * *

Create a webhook project

![info-icon](/api/content/dam/fedex-com/irc/common/Information.svg)

Prerequisites

-   **Review pricing:** subscribers are charged a monthly fee based on the count of track numbers. Refer to the [Pricing Guide](https://developer.fedex.com/api/en-us/guides/pricing-guide.html "pricing-guide") to learn more about pricing.
-   **Set up accounts:** Advanced Integrated Visibility webhook requires a U.S.-based billing account and at least one shipping account, these two account types are mutually exclusive. Only admins can add billing and shipping accounts on the [Manage Organization](https://developer.fedex.com/api/en-us/organization.html#/organization/users "org-settings") page.

**Create a valid (call back) URL in your destination application or platform**

Your destination URL will be used to receive authentication codes and messages as well as webhook payload notifications from FedEx. Your URL must use HTTPS to ensure security. Your URL will be blocked if it includes:

-   RFC1918 IP space
-   fedex.com or any of its subdomains
-   IP addresses in the URL ( including localhost, 127.0.0.1)

**Generate a security token**

This security token can be used as a secret key to authenticate and validate information transmitted between your organization and FedEx. Your security token must include:

-   A minimum length of 26 characters and a maximum length of 100 characters
-   1 upper case character
-   1 lower case character
-   1 numeric character

Example: Y1F6OiVUQW2JPSElmRE9U0IY5

After you have defined your URL and security token, you are ready to create a webhook project. Visit the **My projects** page and open the **Webhooks** tab. Click the **Create a Webhook Project** button.

**Select subscription type**

FedEx Shippers can subscribe their events to account numbers or tracking numbers.

**Step 1: Confirm your billing account and select features**

-   Review the default billing account listed to confirm or select a different one from your organization.
-   Configure your project by selecting features such as proof of delivery options, estimated delivery options, tracking events and event-based filtering.

**Step 2: Enter project details**

-   Give your project an identifiable name that is unique to your organization.
-   Enter your destination URL and security token details that you created during pre-setup authentication (see steps above).
-   To get notified about the latest webhook updates and any outage related information, enter an email address and preferred language.

**Step 3: Read and accept terms**

Once you accept the terms including the FedEx Developer Portal License Agreement and the Order Form, and click the Create button, you will see a confirmation screen.

There may be additional steps based on your subscription type selection. Visit [documentation](https://developer.fedex.com/api/en-us/catalog/shipment-visibility-webhook/docs.html "webhook") to learn more.

[Go To My Projects ![](/api/content/dam/fedex-com/irc/leftnav/read_more_check_arrow.png)](https://developer.fedex.com/api/en-us/project/create.html#/myprojects) 

[3 Test your integration Created with Sketch.](#13)

On the **API project overview** page, retrieve your test credentials ​​— API key, secret key, and shipping account(s) —  from the **Test key** tab. 

**Step 1: Request an OAuth access token**

The OAuth access token must be used with each API transaction. The token is valid only for an hour, so you will need to programmatically code your application to refresh the token before the session expires. Refer to the [API Authorization documentation](https://developer.fedex.com/api/en-us/catalog/authorization/docs.html "api-authorization") for more details.

**Step 2: Review API documentation**

Click on the documentation for each of your APIs to read the business context and understand how to use the API. Log in to download the JSON API collection through the button at the top of your documentation page. You can also review example requests for the endpoint that matches your desired integration.

**Step 3: Use the sandbox to test sample transactions**

Click on the desired endpoint in the left navigation to go to that specific sandbox. Identify the sample requests that match your use case, then use your test credentials and the FedEx test URLs to implement your calls to the endpoint as described in the example requests. Verify that the API call responses you receive match those shown in the documentation. Learn more about our testing experience in the [Sandbox Virtualization Guide](https://developer.fedex.com/api/en-us/guides/sandboxvirtualization.html "sandbox").

**Testing with webhooks**

Testing can help you get a better idea about whether the URL you created is valid. It allows FedEx to identify your URL and build a connection with your URL to send data. Testing can also provide you with sample test data that can help you check and confirm whether you are able to process tracking data provided in your application. Testing does not, however, authenticate your URL. Visit our [webhook documentation](https://developer.fedex.com/api/en-us/catalog/shipment-visibility-webhook/docs.html "webhook") to learn how to test your webhook URL.

[4 Move to production Created with Sketch.](#14)

Visit your **Project overview** page and open the **Production key** tab. Advanced Integrated Visibility Account Number Subscription projects do not need to be moved to production.

**Step 1: Configure project**

-   Rename your key as needed.
-   Review the account number that you selected in step 1 of the project creation flow. This is used to move your project to production. Once your project is live in production, you can add more accounts as needed.

**Step 2: Get project keys**

Copy your production API key and production secret key will be displayed to a secure place. To keep your production secret key secure, we only display it once. If you lose it, you can generate a new one.

After you get your project keys and click **Next,** you will see your project details on the **Production key** tab.

-   To add more shipping accounts to your project, click on **Edit** in the top of the shipping accounts table.

[5 Validate your API Created with Sketch.](#15)

![info-icon](/api/content/dam/fedex-com/irc/common/Information.svg)

Validation steps vary by region

The following steps apply only for customers in the US and Canada. If you live outside of these countries, visit the API Validation page to find support.

Some APIs require shipping label validation for use in our production environment. See if your API requires validation.

**Step 1: Develop and test FedEx APIs with your web-enabled application**

Once you finish developing your web-enabled application, it’s time to complete testing using the test credentials (test shipping account(s), API Key and Secret Key). Your test API Key and Secret Key will be displayed on the Project Overview page and can be seen at any time.

**Step 2: Move your project to production**

After you’ve tested with the FedEx APIs, you need to start the validation process by moving your project to production on the FedEx Developer Portal. Once you’ve done so successfully, you will see your production API Key and Secret Key. You will only see your production Secret Key once, but you will be able to regenerate it at a later time.

**Step 3: Fill out the Label Cover Sheet**

Completely fill out the [Label Cover Sheet](/api/content/dam/fedex-com/irc/common/Label-Cover-Sheet-form.pdf "sheet") with the appropriate contact information as well as what services you plan to implement. Include your account number and production key.

**Step 4: Generate and submit test labels to the Bar Code Analysis Group**

Generate test labels within the FedEx test environment associated with the application and then submit the test labels to the FedEx label evaluation team(s) for approval. The Bar Code Analysis group requires a three-business-day turnaround time for label evaluation.

Follow these best practices to avoid processing delays:

-   Labels must be printed and scanned at a minimum of 600 DPI. DO NOT SEND APIs GENERATED FILES.
-   For thermal printers, the label image type must be requested in accordance with the printer model. Example: ZPLII for Zebra printers.
-   Use the shipper/recipient address information when creating sample labels for evaluation. Only create sample labels for the specific services that are being applied for.
-   FedEx® Collect on Delivery (C.O.D.) label must also include the corresponding C.O.D. Return label.
-   FedEx International Express® shipments must also include the auxiliary/secondary Air Waybill (AWB) label.
-   Multi-piece shipments (MPS) must include one label for each package in the shipment.
-   Email the PDF and Label Cover sheet to label@fedex.com.
-   Physical labels may be sent to the below address:

       FedEx Services

       WTC-Business Solutions Testing

       10 FedEx Parkway

       2nd Floor Horizontal

       Collierville, TN 38017

If the scanned labels are without visible defects (such as lines going through the barcode, spots in the ink, or physical damage), then they may pass inspection and approval will be granted. 

If sending physical labels, pay attention to print quality and accidental enlargement/shrinkage of labels (i.e. scaling). These are the top two reasons why labels do not pass the label evaluation process.

**Step 5: Review the label evaluation**

The Bar Code Analysis group will evaluate the submitted test labels and approve or reject the labels. The Bar Code Analysis group will contact you regarding the approval or rejection of the submitted labels. If the labels are approved, continue to the next step. If the labels are rejected, correct the labels as instructed and resubmit them for approval.

**Step 6: Enable the application**

Once the test labels are approved for production status by the Bar Code Analysis Group, they will authorize your production credentials to transmit the identified shipping label transaction and notify you via email of successful validation. Your approval is on a per project basis.

**Step 7: Replace URL and credentials**

Replace the test URL and test credentials with the production URL and production credentials. Retest your implementation in the production environment using sample data.

* * *

[EXPAND ALL](javascript:void\(0\)) [COLLAPSE ALL](javascript:void\(0\))

[1 Contact FedEx to create your organization Created with Sketch.](#101)

![info-icon](/api/content/dam/fedex-com/irc/common/Information.svg)

Prerequisite

Your business must be an existing FedEx Compatible provider. If your business is not in the Compatible program, then change your selection above to “Non-Compatible Provider.”

**Step 1: Receive invite to join organization**

FedEx will create an organization and then invite one team-member to join the organization. This user will be designated as the admin for your organization.

**Step 2: Accept the invite**

To accept the invite, you will need to either log in with your existing user ID and password or, if your existing user ID is already associated with an organization, you will need to create a new one.

**Step 3: Invite users**

An admin can invite users to their organization and assign them to roles and projects. Open the Users tab. Click the Add Users button.

1.  Select a user role: Viewer, Contributor or Admin. Learn more about roles in our [Organization Administration Guide.](https://developer.fedex.com/api/en-us/guides/organization.html "org")
2.  If you have any existing projects, assign a project to the user. You can also assign users to projects under any Project overview page.
3.  Enter the email addresses of the users you want to join your organization under the selected role.

[Invite Users ![](/api/content/dam/fedex-com/irc/leftnav/read_more_check_arrow.png)](https://developer.fedex.com/api/en-us/organization.html#/organization/users) 

[2 Select products for FedEx to create project(s) Created with Sketch.](#121)

Visit the [API Catalog](https://developer.fedex.com/api/en-us/catalog.html "catalog") to determine the right APIs or webhooks for your solution. Your FedEx Customer Technology Consultant (CTC) and Compatible Channel manager can help you select the right APIs for your solution as per your business needs.

**Step 1: Fill out the PIW**

Return to the Compatible Provider Community (CPC) to fill out the Product Information Worksheet (PIW).

**Step 2: Review project(s) created by FedEx**

Once the PIW has been approved, FedEx will create your project(s). Each version of each of your solutions will have a separate project on the FedEx Developer Portal.

**Step 3: Attend the API demo with your team**

The FedEx Compatible team along with the FedEx CTC and Verification teams will organize a technical demonstration for the APIs with your team. The FedEx team will discuss Compatible Program Verification, new API features and functionality, and answer questions.

[Go To My Projects ![](/api/content/dam/fedex-com/irc/leftnav/read_more_check_arrow.png)](https://developer.fedex.com/api/en-us/project/create.html#/createproject) 

[3 Test your integration and complete verification Created with Sketch.](#131)

On the **API project overview** page, retrieve your test credentials ​​— API key and secret key —  from the **Test key** tab. 

**Step 1: Create customer keys**

Use the Credential Registration API to create customer keys. This is a private API only found in the API section at the bottom of your **API project overview** page.

**Step 2: Request an OAuth access token**

The OAuth access token must be used with each API transaction. The token is valid only for an hour, so you will need to programmatically code your application to refresh the token before the session expires. Refer to the [API Authorization documentation](https://developer.fedex.com/api/en-us/catalog/authorization/docs.html "authorization") for more details. When viewing sample code, make sure “Reseller” is chosen from samples dropdown.

**Step 3: Review API documentation**

Click on the documentation for each of your APIs to read the business context and understand how to use the API. Log in to download the JSON API collection through the button at the top of your documentation page. You can also review example requests for the endpoint that matches your desired integration.

**Step 4: Use the sandbox to test sample transactions**

Click on the desired endpoint in the left navigation to go to that specific sandbox. Identify the sample requests that match your use case, then use your test credentials and the FedEx test URLs to implement your calls to the endpoint as described in the example requests. Verify that the API call responses you receive match those shown in the documentation. Learn more about our testing experience in the [Sandbox Virtualization Guide.](https://developer.fedex.com/api/en-us/guides/sandboxvirtualization.html "sandbox")

**Step 5: Verify each solution**

After fully testing your solutions, submit test cases to the Verification team to verify each solution. FedEx will fully review everything submitted and update you once your verification is approved.

**Testing with webhooks**

If your organization has access to webhooks, testing can help you get a better idea about whether the URL you created is valid. It allows FedEx to identify your URL and build a connection with your URL to send data. Testing can also provide you with sample test data that can help you check and confirm whether you are able to process tracking data provided in your application. Testing does not, however, authenticate your URL. Visit our [webhook documentation](https://developer.fedex.com/api/en-us/catalog/shipment-visibility-webhook/docs.html "webhook") to learn how to test your webhook URL.

[4 Generate the production secret key Created with Sketch.](#141)

FedEx will then move your project(s) to production. Visit your **API project overview page** and open the **Production key** tab. Click the **Generate Secret Key** link under the **Secret key** column.

You are now able to retest your implementation in the production environment using sample data.

* * *

[EXPAND ALL](javascript:void\(0\)) [COLLAPSE ALL](javascript:void\(0\))

[1 Create or join an organization Created with Sketch.](#20)

![info-icon](/api/content/dam/fedex-com/irc/common/Information.svg)

Prerequisite

You must have a FedEx user ID and account to log into the FedEx Developer Portal and create an organization.

Either create an organization, if one does not yet exist for your company, or join your company’s existing organization.

Create a new organization

To create your own organization, click on **Create Organization** in the left-hand navigation. If you create an organization, you will automatically be listed as the admin of that organization.

-   An admin can invite users to join their organization and assign them to roles (e.g. contributor or viewer) and projects.
-   To learn more about these roles, explore our [Organization Administration Guide.](https://developer.fedex.com/api/en-us/guides/organization.html "org")

**Step 1: Provide organization information**

-   Provide your company name, website URL and business email for verification.
-   Create an organization name. Give your organization a name that other users will recognize. This name can be used to organize your company into more specific groups (e.g. department, division, region, location) or can be the same as your company name.
-   Enter the location information where your company is based and where you plan to sell or distribute your software solution.

**Step 2: Add and authenticate account**

Enter your existing FedEx account number, account nickname, and billing address associated with the account. We will validate the billing address to be sure it matches the account details to prevent fraudulent activities. If you do not have an existing FedEx account, [open a new account](https://www.fedex.com/apps/myprofile/accountmanagement/ "account") or contact your FedEx customer representative.

-   As a third party provider entering the FedEx Integrator Program, the account used for this initial registration must belong to you as the Integrator.  The use of an end customer account is not permitted.
-   This account will be set as the default billing account for your organization.

**Step 3: Read and accept terms**

Once you accept the Developer Agreement and the Program Manual(s), you will see a confirmation screen. As the admin of your new organization, you can then click **Manage Organization** in the left-hand navigation to view or edit details.

**Step 4: Invite users**

An admin can invite users to their organization and assign them to roles and projects. Open the **Users** tab. Click the **Add Users** button.

1.  Select a user role: Viewer, Contributor or Admin.
2.  If you have any existing projects, assign a project to the user. You can also assign users to projects under any **Project overview** page.
3.  Enter the email addresses of the users you want to join your organization under the selected role.

[Create an Organization ![](/api/content/dam/fedex-com/irc/leftnav/read_more_check_arrow.png)](https://developer.fedex.com/api/en-us/organization/create.html#/createorganization) 

Join an existing organization

**Step 1: Ask the admin of your organization to send you an invite.**

If your company has already created an organization, ask the admin of the organization to invite you to join. You will have 24 hours to accept their invite. If you miss this window of time, you can always ask them to resend it.

**Step 2: Accept the invite.**

To accept the invite, you will need to either log in with your existing user ID and password or, if your existing user ID is already associated with an organization, you will need to create a new one.

[2 Create a project Created with Sketch.](#22)

Visit the **My projects** page and open the **APIs** tab. Click the **Create API Project** button.

**Step 1: Select the API(s) you want to include in your project**

Review the Ship, Rate and other API quotas, rate limits, and API validation details.

-   If you select the Ship or Open Ship API, the Service Availability API and the Trade Documents Upload API will be automatically selected, as these are essential APIs to be used when using the Ship or Open Ship API.

**Step 2: Configure project details**

Give your project an identifiable name that is unique to your organization.

**Step 3: Read and accept terms, including the FedEx Developer Portal License Agreement**

Once you accept the terms and click the Create button, you will see a confirmation screen. You can then view your test credentials within your new project.

* * *

Create a webhook project

![info-icon](/api/content/dam/fedex-com/irc/common/Information.svg)

Prerequisites

-   **Review pricing:** subscribers are charged a monthly fee based on the count of track numbers. Refer to the [Pricing Guide](https://developer.fedex.com/api/en-us/guides/pricing-guide.html "pricing-guide") to learn more about pricing.
-   **Set up accounts:** Advanced Integrated Visibility requires a U.S.-based billing account and at least one shipping account, these two account types are mutually exclusive. Only admins can add billing and shipping accounts on the [Manage Organization](https://developer.fedex.com/api/en-us/organization.html#/organization/users "billing") page.

**Create a valid (call back) URL in your destination application or platform**

Your destination URL will be used to receive authentication codes and messages as well as webhook payload notifications from FedEx. Your URL must use HTTPS to ensure security. Your URL will be blocked if it includes:

-   RFC1918 IP space
-   fedex.com or any of its subdomains
-   IP addresses in the URL ( including localhost, 127.0.0.1)

**Generate a security token**

This security token can be used as a secret key to authenticate and validate information transmitted between your organization and FedEx. Your security token must include:

-   A minimum length of 26 characters and a maximum length of 100 characters
-   1 upper case character
-   1 lower case character
-   1 numeric character

Example: Y1F6OiVUQW2JPSElmRE9U0IY5

After you have defined your URL and security token, you are ready to create a webhook project. Visit the **My projects** page and open the **Webhooks** tab. Click the **Create a Webhook Project** button.

**Select subscription type**

FedEx Shippers can subscribe their events to account numbers or tracking numbers.

**Step 1: Confirm your billing account and select features**

-   Review the default billing account listed to confirm or select a different one from your organization.
-   Configure your project by selecting features such as proof of delivery options, estimated delivery options, tracking events and event-based filtering.

**Step 2: Enter project details**

-   Give your project an identifiable name that is unique to your organization.
-   Enter your destination URL and security token details that you created during pre-setup authentication (see steps above).
-   To get notified about the latest webhook updates and any outage related information, enter an email address and preferred language.

**Step 3: Read and accept terms**

Once you accept the terms including the FedEx Developer Portal License Agreement and the Order Form, and click the Create button, you will see a confirmation screen.

There may be additional steps based on your subscription type selection. Visit [documentation](https://developer.fedex.com/api/en-us/catalog/shipment-visibility-webhook/docs.html "webhook") to learn more.

[Go To My Projects ![](/api/content/dam/fedex-com/irc/leftnav/read_more_check_arrow.png)](https://developer.fedex.com/api/en-us/project/create.html#/myprojects) 

[3 Test your integration Created with Sketch.](#23)

On the **API project overview** page, retrieve your test credentials ​​— API key and secret key —  from the **Test key** tab. 

**Step 1: Request an OAuth access token**

The OAuth access token must be used with each API transaction. The token is valid only for an hour, so you will need to programmatically code your application to refresh the token before the session expires. Refer to the [API Authorization documentation](https://developer.fedex.com/api/en-us/catalog/authorization/docs.html "auth") for more details.

**Step 2: Review API documentation**

Click on the documentation for each of your APIs to read the business context and understand how to use the API. Log in to download the JSON API collection through the button at the top of your documentation page. You can also review example requests for the endpoint that matches your desired integration.

**Step 3: Use the sandbox to test sample transactions**

Click on the desired endpoint in the left navigation to go to that specific sandbox. Identify the sample requests that match your use case, then use your test credentials and the FedEx test URLs to implement your calls to the endpoint as described in the example requests. Verify that the API call responses you receive match those shown in the documentation. Learn more about our testing experience in the [Sandbox Virtualization Guide.](https://developer.fedex.com/api/en-us/guides/sandboxvirtualization.html "sandbox")

**Testing with webhooks**

If your organization has access to webhooks, testing can help you get a better idea about whether the URL you created is valid. It allows FedEx to identify your URL and build a connection with your URL to send data. Testing can also provide you with sample test data that can help you check and confirm whether you are able to process tracking data provided in your application. Testing does not, however, authenticate your URL. Visit our [webhook documentation](https://developer.fedex.com/api/en-us/catalog/shipment-visibility-webhook/docs.html "webhook") to learn how to test your webhook URL.

[4 Move to production Created with Sketch.](#24)

Visit your **Project overview** page and open the **Production key** tab. Advanced Integrated Visibility Account Number Subscription projects do not need to be moved to production.

**Step 1: Configure project**

Rename your key as needed.

**Step 2: Get project keys**

Copy your production API key and production secret key will be displayed to a secure place. To keep your production secret key secure, we only display it once. If you lose it, you can generate a new one.

After you get your project keys and click **Next**, you will see your project details on the **Production key** tab.

[5 Validate your API Created with Sketch.](#25)

![info-icon](/api/content/dam/fedex-com/irc/common/Information.svg)

Validation steps vary by region

The following steps apply only for customers in the US and Canada. If you live outside of these countries, visit the API Validation page to find support.

Some APIs require shipping label validation for use in our production environment. See if your API requires validation.

**Step 1: Develop and test FedEx APIs with your web-enabled application**

Once you finish developing your web-enabled application, it’s time to complete testing using the test credentials (test API key and secret key). Your test API Key and Secret Key will be displayed on the Project Overview page and can be seen at any time.

1.  Identify all test cases for the regions/territories where you want to validate and deploy your solution. The test cases can be found in the [Integrator test case baseline.](https://www.fedex.com/content/dam/fedex-com/hdn/FedEx_Integrator_Test_Case_Baseline.xlsx "testcase")
2.  Before you run the test cases, you will need to run the registration transactions for the respective test account numbers available in the test case baseline. 
3.  Then, run all test cases for the regions/territories where you want to validate and deploy your solution.

**Step 2: Fill out the PIW and the Validation Cover Sheet**

Completely fill out the [Product Information Worksheet (PIW)](https://www.fedex.com/content/dam/fedex-com/hdn/FedEx_Integrator_Product_Information_Worksheets_links_directory.pdf "pwi") and the [Integrator Validation Cover Sheet](https://www.fedex.com/content/dam/fedex-com/hdn/FedEx_Integrator_VALIDATION_COVER%20SHEET_Global.pdf "cover") with the appropriate contact information as well as what services and capabilities you plan to offer.

**Step 3: Generate and submit deliverables to the Validation team**

Collect the following deliverables, compress into a .zip file and email to validationmtp@fedex.com. We advise you to submit your files in a .zip file to reduce the risk of your submission being blocked by the email provider. 

-   Completed PIW(s) for all territories/regions indicated (format: PDF)
-   Completed Validation Cover Sheet (format: PDF)
-   Screenshots of the following (format: PDF):
    -   Your customer-facing solution displaying FedEx services/Special handling
    -   Disclaimer Statement
    -   EULA agreement
    -   End-customer registration flow
-   End-customer registration transactions — Multi-Factor Authentication including invoice and PIN available for SMS, call and email (format: JSON request/response files)
-   Scanned copies of actual printed labels for all test cases included in the test case baseline for the territories where you want your solution to be validated (format: PDF or PNG)
-   Ship transactions of three test cases, one for each label image type: PDF, PNG and ZPL. (format: JSON request/response files)

Follow these best practices to avoid processing delays:

-   Labels must be printed and scanned at a minimum of 600 DPI.
-   For thermal printers, the label image type must be requested in accordance with the printer model. Example: ZPLII for Zebra printers.
-   FedEx International Express® shipments must also include the auxiliary/secondary Air Waybill (AWB) label.
-   Multi-piece shipments (MPS) must include one label for each package in the shipment.

**Step 4: Review the label evaluation**

The Validation team will evaluate the submitted deliverables and approve or reject the submission. The Validation team will contact you regarding the approval or rejection of the submission. If the deliverables are approved, continue to the next step. If the deliverables are rejected, correct the transactions, screens, and/or labels as instructed and resubmit them for approval.

**Step 5: Enable the application**

Once all of the deliverables are approved for production status by the Validation team, they will authorize your production credentials to transmit the identified shipping label transaction and notify you via email of successful validation. Your approval is on a per project basis.

**Step 6: Follow the post-validation instructions**

Review the post-validation instructions and follow as needed.

* * *