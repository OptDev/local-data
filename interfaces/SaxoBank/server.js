const express = require('express')
const axios = require('axios')
const fs = require('fs')
require('dotenv').config()

// load SaxoBank Class
const SaxoBank = require('./SaxoBank.js')
// create an object
const sbObj = new SaxoBank()

const exceptionEndPoints = ['/api/acb', '/api/login', '/api/authorize']
const app = express()
const port = process.env.LOCAL_DATA_PORT

// Middleware to parse JSON requests
app.use(express.json())

// Middleware for access token data
const passAccessTokenDataToReq = async function (req, res, next) {
  // Is it an excpetion end point
  if (exceptionEndPoints.includes(req.originalUrl.split('?').shift())) {
    next()
    return
  }

  const { tusername } = req.query
  // authorization is not set
  if (!req.headers.authorization && !tusername) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  let opUsername
  if (tusername) {
    // Is the test username set?
    opUsername = tusername
  } else {
    // username : Optuma Username
    // password : null
    const base64Credentials = req.headers.authorization.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8')
    opUsername = credentials.split(':')[0]
  }

  const accessTokenData = await sbObj.getAccessTokenDataFromLocal(opUsername)
  // access_token not available ( expired or not eixst )
  if (!accessTokenData.access_token && accessTokenData.status === '0') {
    // accessTokenData is an error json here
    // accessTokenData.errordesc is the authorization full url
    res.json(accessTokenData)
    return
  }

  // pass accessTokenData to req
  req.accessTokenData = accessTokenData
  // pass username to req
  req.opUsername = opUsername

  next()
}
app.use(passAccessTokenDataToReq)

/* 
  callback url for an application of provider
  get access_token from code ( it is in url parameter )
  ex) http://localhost:3000/api/acb
*/
app.get('/api/acb', (req, res) => {
  sbObj.getAccessTokenDataFromProvider(req, res)
})

/*
  login : if privider uses oauth then it will return AUTHENTICATION_URL
*/
app.post('/api/login', (req, res) => {
  sbObj.login(req, res)
})

/*
  check if oauth is authorized or not
*/
app.get('/api/authorize', (req, res) => {
  sbObj.authorize(req, res)
})

/* 
  open streaming

  Optuma sends [GET] /api/quotes get request with a list of live symbols
  based on availability, MICs and FIGIs list are matched to the symbols list.
  E.g.,  
    symbols = code1, code2, code3
    mics = MIC for code1, MIC for code2, MIC for code3, .. etc
    figis = FIGI for code1, ...  etc
    empty mics/figis contains a list of commas  = ,,,,

  Optuma is expecting to receive a list of ticks, using the following structure:

  Optuma uses exchange date time for the EOD data. If this data provider supports live tick and intraday data, together with Optuma EOD data. Then it is recommended to use the exchange date time to align with the EOD charts.

  {"status":1,"symbol":"AUDUSD","datetime":"2023-05-22 06:22:38.056","daydate":"2023-05-22","bid":0.66459,"ask":0.66467,"type":"q","complete":true},
  {"status":1,"heartbeat": 1},
  {"status":1,"symbol":"CBA","datetime":"2023-05-22 17:30:30.15","daydate":"2023-05-22","open":95.61,"close":97.61,"high":98.61,"low":94.61,"volume":1234567,"netchange": 2, "type":"s","complete":true},
  {"status":1,"heartbeat": 1},
  {"status":1,"symbol":"CBA","datetime":"2023-05-22 17:22:38.15","daydate":"2023-05-22","close":97.60, "volume":100,"type":"t","complete":true},  
  {"status":1,"heartbeat": 1},
  {"status":1,"symbol":"CBA","datetime":"2023-05-22 17:30:32.15","daydate":"2023-05-22","open":93.63,"close":95.63,"high":96.63,"low":92.63,"volume":1204567,"netchange": 2, "type":"q","complete":true},
  {"status":1,"heartbeat": 1}

  type q - quote 
    for equity, this is used separately only for display in the watchlist, course of trades or chart header. This should have OHLCV and other fields for display.
    for FX, this is usually the only data received. So the Bid of the quote is also being treated as the trade tick that is the latest close or last value for the current bar.

  type t - trade
    for equity, this is the latest close or last value for the current bar

  type s - snapshot of current day
    Optuma expects to receive one snapshot data point as the first response of the open_stream to build today's bar first. Then the rest of the trade ticks will follow and grows today's bar.
*/
app.get('/api/quotes', async (req, res) => {
  if (process.env.DEBUG === 'true') console.log('[GET] /api/quotes', req.query)
  sbObj.openStream(req, res)
})

/* 
  close streaming

  [DELETE] /api/quotes provides a way to manage the stream resources.

  Optuma does not open a new stream immediately upon close_stream.
  It waits until there is a new code request. Then it kills the previous open_stream request and 
  recreate a new open_stream with a new list of open codes.
*/
app.delete('/api/quotes', async (req, res) => {
  if (process.env.DEBUG === 'true') console.log('[DELETE] /api/quotes', req.query)
  sbObj.closeStream(req, res)
})

/* 
  lookup - search

  [GET] /api/lookup request is sent from the Search By Code dialog in Optuma.
  You can find this option from the right click menu of the custom provider exchange that is listed in the security selector in Optuma.

  In custom_provider.yaml file, if the search_type is empty or missing, then the Search button is disabled.
  It means the client should not be able to send this request.

  You can name and extend the search types.
  type in the req.query is an integer, which is the index of the search types provided in custom_provider.yaml file.
*/
app.get('/api/lookup', (req, res) => {
  if (process.env.DEBUG === 'true') console.log('[GET] /api/lookup', req.query)
  sbObj.lookup(req, res)
})

/* 
  lookup options - return search options
*/
app.get('/api/lookup/options', (req, res) => {
  if (process.env.DEBUG === 'true') console.log('[GET] /api/lookup/options', req.query)
  sbObj.lookupOptions(req, res)
})

/* 
  history - return history

  [GET] /api/history request is being sent first when open a chart.
  after the history is completed, then Optuma sends open_stream request

  if last_data_set = 0, it means there is more than one response for the current request.
  when receiving the last response, make sure to set last_data_set = 1
  
  Optuma is able to process each response separately and reflect on the chart.
  symbol in req.query is the unique code that is used to match the source of the request
*/
app.get('/api/history', (req, res) => {
  if (process.env.DEBUG === 'true') console.log('[GET] /api/history', req.query)
  sbObj.history(req, res)
})

/* 
  instruments - return instruments
*/
app.get('/api/instruments', (req, res) => {
  sbObj.instruments(req, res)
})

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})

// refresh access-token for all clients every 10 minutes
setInterval(() => {
  fs.readdir('./', (err, files) => {
    files.forEach((file) => {
      const [prefix, opUsername, extension] = file.split('.')
      if (prefix === 'atd' && extension === 'dat') {
        sbObj.refreshAccessToken(file, opUsername)
      }
    })
  })
}, 1000 * 60 * 10)
