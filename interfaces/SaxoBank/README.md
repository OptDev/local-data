# SaxoBank REST Server
> This is under development and is not ready for use until this note is removed.

## Author
Optuma Development Team.

## Version
0.01

## Description
This project allows anyone to connect Optuma to SaxoBank. SaxoBank is a very secure and complex interface and there are a number of steps involved to set this up. Please follow along carefully and pay attention to any prerequisites. 

If you would rather Optuma support staff assist you with this, you can book a support consultation at https://www.optuma.com/consults

## Prerequisites
### Optuma
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

#### Configure Server
The SaxoBank interface has a config file (.env) that needs to be configured.
Copy the .env.example to .env in the interface folder (save location as server.js)
edit the .env and add any keys required.

#### Start Node Server
This starts the server and in a browser you can go to the URL:Port (by default http://localhost:3000) and see a message confirming that your Node server is running.
```
cd Interfaces/<interface>
node server.js
```

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
| Field | Required | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | * | string | The name that will be displayed in Optuma. Usually, it is best to keep it as the name of the provider. | Bears Data |
| code | * | string | A short unique code (3 t0 4 letters max) for this feed. The code is stored with the symbol in Optuma. | BEAR |
| authenticate | * | node | The authentication settings | |
| value | * | boolean | Does Optuma need to manage authentication settings for this connection. Typically, this is used in remote services where the client has an account and is required to log in. | true |
| username || string | The default username. The user will be prompted to update this when they configure the connection in Optuma. | user |
| password^ || string | The default password. The user will be prompted to update this when they configure the connection in Optuma. | password |
| token^ || string | Some providers may require a token to be stored and sent. Typically, this is used in remote services where the client has an account and is required to log in. | JzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ikpva |
| web || string | This is the web address of a page that explains more about this connection. It is displayed as a *More Information* link in the connection configuration form in Optuma. | https://github.com/OptDev/local-data | 
| server | * | string | The address of the REST server that Optuma needs to connect to. | http://localhost |
| port | * | integer | The port, or channel, that the REST server is expecting connections on. This must be a unique unused port on each server/pc. | 3000 |
| data_products || node | Optuma data product ids
| id || integer | Optuma data product id. The Optuma Data Selection Ids they represent are included in the tool ReadMe file in this repository. If this is not set, individual securities will have to be manually added in Optuma. | 181 |
| gmt-offset || integer | The GMT offset in hours for the data product if the timestamps in the data are sent in UTC. | -4, 0, 10 |
| timeframes | * | set of strings | A comma-separated array of time frames which this service can return historical data for. | Day, Minute, Tick |
| realtime | * | boolean | Does this service return streaming tick data? | false |




