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




## Configuration File

The way that Optuma knows that there is a data service available, and how to connect to it, is through the Custom_Providers.yaml file.
As mentioned above, the default location for this file is
```
{Documents}\Optuma\Local\Common
```

The following is an example of the configuration file.
```yaml 
---
demo1:
  name: Demo Custom Provider
  code: demo1
  authenticate:
    value: true
    username: demouser
    password:
    token: 222
  web: https://google.com
  server: http://localhost
  port: 3000
  data_products: 1,6
  timeframe: Day,Minute,Tick
  realtime: true
  search_type: Search by Code|Search by Description|Search by Figi
```
| Field | Required | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | * | string | The name that will be displayed in Optuma. Usually it is best to keep it as the name of the provider. | Bears Data |
| code | * | string | A short unique code (3 t0 4 letters max) for this feed. The code is stored with the symbol in Optuma. | BEAR |
| authenticate | * | node | The authentication settings | |
| value | * | boolean | Does Optuma need to manage authentication settings for this connection. Typically, this is used in remote services where the client has an account and is required to login. | true |
| username || string | The default username. The user will be prompted to update this when they configure the connection in Optuma. | user |
| password^ || string | The default password. The user will be prompted to update this when they configure the connection in Optuma. | |
| token^ || string | Some providers may require a token to be stored and sent. Typically, this is used in remote services where the client has an account and is required to login. | JzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ikpva |
| web || string | This is the web address of a page that explains more about this connection. It is displayed as a *More Information* link in the connection configuration form in Optuma. | https://github.com/OptDev/local-data | 
| server | * | string | The address of the REST server that Optuma needs to connect to. | http://localhost |
| port | * | integer | The port, or channel, that the REST server is expecting connections on. This must be a unique unused port on each server/pc. | 3000 |
| data_products || integers | A comma seperated array of Optuma data product ids. A partial list of the ids and the Optuma Data Selection they represent is included below. If this is not set, individual securities will have to be manually added in Optuma. | 1, 6, 181 |
| timeframes | * | set of strings | A comma separated array of time frames which this service can return historical data for. | Day, Minute, Tick |
| realtime | * | boolean | Does this service return streaming tick data? | false |
| search_type || set of strings | A pipe (\|) separated array of search strings. In the Optuma search, what are the options that should be shown to the user. | Search by Code\|Search by Description\|Search By FIGI |

^ For services where a user specific password or token is required, it is recommended that those details not be entered in here but rather the user enters them when they *Configure Data Providers* in Optuma.

It's important to note that there can be multiple data sources configured in this one file. Each service will be under a master node in the yaml file.
Note: If multiple services are being used on the same PC (as a server), they must operate on unique ports.
```
---
demo1:
  name...
  ...

demo2:
   name...
   ...
```

