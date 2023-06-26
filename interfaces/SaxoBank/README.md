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
if you moved your Optuma Document folder to a different location, then you will need to move this file to that location. You can see your current documents location in Optuma by selecting the *Settings* menu and then *File Location Settings*.

### Restart Optuma 
Once restarted, follow these steps in Optuma to make the connection:
* From the *Data* menu, select *Configure Data Providers* and select the local data interface. 
  The data sources that are supported by this interface (defined in the Custom_Providers.yaml file) will be listed. Move them to the right.

* Open any file from one of the selected exchanges.
  The sample data is very choppy and it will be obvious that the sample data is being read.
  
CONGRATULATIONS - you have successfully connected your copy of Optuma to a REST server and you can now start developing your own connection to the data provider of your choice.


## Developing a Server

Now that you have a connection established, you can start to develop your connection. 

NOTE: If you plan to submit your work back into the public repository for others to use, please follow these guidelines.
* Never include passwords or tokens in your js files and upload them to the repository. They are requested from the user when they select *Configure Data Providers* in Optuma.
* Create a folder under *Interfaces* with the name of the data source your work is for.
* copy your server.js and any other files into this new location
* copy Custom_Providers.yaml into this location and fill with sample data that another user will update. Note: this file will not be used in this location, it is only there as a reference of how to access your system. While developing, you will need to edit the Custom_Providers.yaml file in the Optuma Documents location.

## Configuration File

The way that Optuma knows that there is a local data service available, and how to connect to it, is through the **Custom_Providers.yaml** file.
As mentioned above, the default location for this file is
```
{Documents}\Optuma\Local\Common\Custom_Providers.yaml
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


^ For services where a user-specific password or token is required, it is recommended that those details not be entered in here but rather the user enters them when they *Configure Data Providers* in Optuma.

### Multiple Data Sources
It's important to note that there can be multiple data sources configured in this one file. Each service will be under a master node in the yaml file.
Note: If multiple services are being used on the same PC (as a server), they must operate on unique ports.
```yaml
---
demo1:
  name: Data Source 1
  ...
  port: 3000

demo2:
   name: Data Source 2
   ...
   port: 3001
```

### Making Your Server Public
Once you have coded a new Node server and it is all working well, you can commit and push your server back to OptDev, so it's available for others to use. Follow these steps to make your local data server available to others.

Fork: You first create a personal copy of this project by "forking" the project in Github.

Branch: In your forked repository, you create a new branch off the main branch to work on your proposed changes. 

Make Changes: Create a new folder with the provider name under the Interfaces folder as a place to add your new server code.

Commit: As you work on your changes, you commit your modifications to the branch.

Push: Once you're ready to share your changes with the original project, you push your branch with the committed changes to your forked repository on the version control platform.

Create a Pull Request: On Github, you initiate a pull request by comparing the changes in your branch with the original project's main branch. This action submits a request for the project maintainers to review your proposed changes.

Review and Discussion: The project maintainers will review your changes, and provide feedback. This process often takes place in the comments section of the pull request.

Merge: Once the project maintainers are satisfied with your additions, they can choose to merge your branch into the main branch of the original project. This action incorporates your modifications into the official codebase available for others.


### Data Product Ids
Data Product Id|Name
---|---
1|ASX Shares
3|Sydney Futures Exchange
5|World Indices
6|Foreign Exchange
7|ASX Options and Warrants
21|CBOT
20|CME
22|NYBOT
34|LSE
65|Commodities
72|TSXV
71|TSX
67|Singapore
74|OTCBB
78|NSE
80|American Futures
81|European Futures
82|Asian Futures
107|Dow Jones Indices
109|S&P Indices
111|TSX Indices
114|US Funds
117|Euronext Stocks
119|Johannesburg Stocks
120|Major Euro Stocks
121|Minor Euro Stocks
122|Nordic Stocks
123|TEL Aviv Stocks
125|Chinese Stocks
127|Japan Stocks
129|Mexican Stocks
131|Hong Kong Stocks
134|Brazilian Equities
169|COT Data
152|Korean Equities
155|Taiwan Equities
158|Malaysian Equities
161|New Zealand Equities
164|Chilean Equities
181|US Equities
191|CBOE Indices
185|Indonesian Stocks
187|Crypto Currencies
209|European Indices
211|Chi-X Australia
217|Vietnam Equities
223|US Mutual Funds
227|Taipei Stocks
229|Philippines Equities
231|Turkey Equities
235|Hang Seng Indices

