# local-data

This project allows anyone to connect Optuma to a data service that Optuma does not support directly. Because nearly every data source has their own format, there needs to be an interpreter that can speak both the Optuma and data provider language. This Node server can be used as the interpreter.

Note: we are using Node.js as the platform for the data server in our examples. You can also develop a REST based server (either as an application or a hosted web server) using any environment you are familar with.

On start-up, Optuma will search for any local-data configuration files. The configuration contains all the information Optuma needs to connect to the local Node server. Optuma will also create a custom folder in the Security Selector but the Node server should be able to accept all Optuma securities and translate those too.

To create a new interface, you will need to develop or download the applicable javascript file that Node can run. The javascript is where you will define the translation between Optuma and the data source.

## Prerequisites
### Optuma Services
The ability to access local data in Optuma is restricted to subscribers of Enterprise, Professional, or Trader Services. You need to make sure you have an active subscription to Optuma before this will work.

## Required Applications
### Node.js
If you've never used Node on your PC, you will need to download and install the Node application. Node is a javascript server application that is used by millions of applications around the world.
https://nodejs.org/en/download
Note: The Node application can be installed anywhere and the default location they suggest is best. Do not install it into the same directory as any Optuma programs.

### Install Visual Studio Code
VSC is a code editor provided for free by Microsoft. You can download it from https://code.visualstudio.com/download
If you already have VSC installed, make sure you restart it after installing Node above.

## Installation

The following instructions will step you through cloning the repository and connecting the sample Node server to Optuma.

### Clone the Optuma Node Server
```
git clone https://github.com/OptDev/local-data.git
```
You can also download the code by pressing on the Green Code button at the top right of this page.

### Open VSCode
Select the folder that you downloaded.

#### Install packages
```
npm install
```

#### Start Node Server
```
node server.js
```

### Setup the Configuration
You need to copy the Custom_Providers.yaml file from this repository to the Optuma Settings folder. This file is set up as a sample to connect to the Node server that has already been started.

The default location for this is
```
{Documents}\Optuma\Local\Common
```
if you moved your Optuma Document folder to a different location, then you will need to move this file to that location. You can see your current documents location in Optuma by selectiong the *Settings* menu and then *File Location Settings*.

### Restart Optuma 
Follow these steps in Optuma to make the connection:
* From the *Data* menu, select *Configure Data Providers*. 
  The data sources that are supported by this server (defined in the Custom_Providers.yaml file) will be listed. Move them to the right.

* Open any file from one of the selected exchanges.
  The sample data is very choppy and it will be obvious that the sample data is being read.
  
CONGRATULATIONS - you have sucessfully connected your copy of Optuma to a REST server and you can now start developing your connection to the data provider of your choice.


## Developing a Server

Now that you have a connection established, you can start to develop your connection. 

NOTE: If you plan to submit your work back into the public repository for others to use, please follow these guidelines.
* Never include passwords or tokens in your js files and upload them to the repository. They should be configured in the Custom_Providers.yaml file by the user when necessary.
* Create a folder under *Interfaces* with the name of the data source your work is for.
* copy server.js into this new location
* copy Custom_Providers.yaml into this location and fill with sample data that another user will update. Note: this file will not be used in this location, it is only there as a reference of how to access your system. While developing, you will need to edit the Custom_Providers.yaml file in the Optuma Documents location.




### Config file - custom_providers.yaml

Create `custom_providers.yaml` and place this file in the Optuma Data Folder.

This defines the data provider and how Optuma interacts with it.

```
---
demo1:
  name: Demo Custom Provider
  code: demo1
  comment1: |
    [code] is a unique name id for the custom provider as well as its custom exchange id.
  authenticate:
    value: true
    username: demouser
    password:
    token: 222
    comment: |
      If [authenticate] value is false, login details (username, password, token) will be ignored and not display in Optuma. |
      [authenticate] can only have either password or token/API Key. |
      If both password and token/API Key are present, Optuma only shows API Key input field.
  web: https://google.com
  comment2: |
    [web] address is the link display in Optuma Config Data Providers for clients to visit your web page.
  server: http://localhost
  port: 3000
  data_products: 1,6
  comment3: |
    [data_products] is a comma separated list of Optuma exchange id supported by this provider. |
    1 - ASX, 6 - Foreign Exchange   Please refer to the Optuma's exchange list. |
    This means this provider supports ASX and FX data. |
    Users can see these exchanges apepar in the Config Data Providers page to select them.
  timeframe: Day,Minute,Tick
  realtime: true
  comment4: |
    [timeframe] is the type of history data supported for the data_products. |
    If it only supports Day, please also indicate if this has real time ticks or not. |
    If it does not, then set [realtime] to false
  search_type: Search by Code|Search by Description|By MIC
  comment5: |
    if [search_type] is empty or missing, then the search button in Optuma is disabled.
```

It can have multiple data providers.

```
---
demo1:
  name...
  ...
  ...

demo2:
   name...
   ...
   ...

```
