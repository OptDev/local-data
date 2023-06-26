# SaxoBank REST Server
> This is under development and is not ready for use until this note is removed.

## Author
Optuma Development Team.

## Version
0.01

## Description
This project allows anyone to connect Optuma to SaxoBank. SaxoBank is a very secure and complex interface and there are a number of steps involved to set this up. Please follow along carefully and pay attention to any prerequisites. 

If you would rather Optuma support staff assist you with this, you can book a support consultation at https://www.optuma.com/consults

## Optuma Requirements
Optuma 2.2 (released July 2023)
An active Enterprise, Professional, or Trader Services subscription. 

## Required Applications for Development
### Node.js
Node is a javascript server application that is used by millions of applications around the world and it allows for simple applications to be run on your PC as a server.
If you've never used Node on your PC, you will need to download and install the Node application. 
https://nodejs.org/en/download
Note: The Node application can be installed anywhere and the default location they suggest is best. There is no need to install it into the same directory as any Optuma programs.

## Installation
The following instructions will step you through cloning the repository and connecting the sample Node server to Optuma.

### Download the SaxoBank Folder by using the following link
```
https://minhaskamal.github.io/DownGit/#/home?url=https://github.com/OptDev/local-data/tree/main/interfaces/SaxoBank
```
Unzip the file to a folder on your PC. eg C:\SaxoBank

### Install Dependencies
* Open a command prompt - Right-click the Windows Start button and select Terminal 
* Navigate to the folder where you saved SaxoBank
```
cd C:\SaxoBank
```
* Install Node Packages
```
npm install
```

## SaxoBank Configuration
### Enable Market Data in Saxo Trader Go
Follow the instructions on this page to enable Market Data access via the Open API.
```
https://www.developer.saxo/excel/user-guide/enabling-market-data
```
### Create an OpenAPI simulation account in the SaxoBank Developer Portal
Even if you don't have a SaxoBank account, you can create a simulation account and link that to Optuma.
```
https://www.developer.saxo/accounts/sim/signup
```
### Create an OpenAPI Application in SaxoBank
By default, this link will create a simulation account but you can click on "Live Apps" in the left menu to create a connection to your account.
There is no need to enable Trading as this interface does not pass through trades to Optuma.
```
https://www.developer.saxo/openapi/appmanagement#/
```
* Click on Create Application
* Give it a name and description of your choice
* Update "Redirect URL" to http://localhost:3000/api/acb
* Set "Grant Type" to Code
* Do Not check "Allow this app to be enabled for trading"
* Once created, click on your App to see the details.

### Update the .env file with your App details
The SaxoBank interface has a config file (.env) that needs to be configured so that it can connect with the Saxo App you just created.
Copy the .env.example to .env in the interface folder (save location as server.js)
edit the .env and set the following - all values are found in the Saxo App you just created.
* SAXOBANK_OAUTH_CLIENT_ID={App Key}
* SAXOBANK_OAUTH_CLIENT_SECRET={App Secrets - first one in the list}
* SAXOBANK_AUTHENTICATION_URL={Authorization Endpoint}

### Setup the Optuma Configuration
You need to copy the Custom_Providers.yaml file from this repository to the Optuma Settings folder. This file is set up as a sample to connect to the Node server that has already been started.

The default Optuma Settings location is
```
{Documents}\Optuma\Local\Common
```
if you moved your Optuma Document folder to a different location, then you will need to move this file to that location. You can see your current documents folder location in Optuma by selecting the *Settings* menu and then *File Location Settings*.

### Restart Optuma 
Once restarted, follow these steps in Optuma to make the connection:
* From the *Data* menu, select *Configure Data Providers* and select the local data interface. 
  The data sources that are supported by this interface (defined in the Custom_Providers.yaml file) will be listed. Move them to the right.

#### Start Node Server
This starts the server and in a browser, you can go to the URL:Port (by default http://localhost:3000) to confirm that your Node server is running.
```
cd Interfaces/<interface>
node server.js
```

## Configuration File
The way that Optuma knows that there is a local data service available, and how to connect to it, is through the **Custom_Providers.yaml** file.
As mentioned above, the default location for this file is
```
{Documents}\Optuma\Local\Common\Custom_Providers.yaml
```

The following is an example of the configuration file.
```yaml 
---
saxobank:
  name: Saxo Bank Limited
  code: saxobank
  source: saxobank
  authenticate:
    value: true
    username: demouser
    password: 
    token: 222
  web: https://google.com
  server: http://localhost
  port: 3000
  data_products:
  - id: 1
    gmt-offset: 10
  - id: 6
    gmt-offset: 0
  - id: 181
    gmt-offset: -4
  timeframe: Day,Minute,Tick
  realtime: true
```




