const express = require('express')
const axios = require('axios')
const sampleDaily = require('./data/AAA.json')
const sampleTicks = require('./data/sampleTicks.json')

const app = express()
const port = 3000 // or any port number you prefer

// Middleware to parse JSON requests
app.use(express.json())

let externalStream // hold the external data stream reference so this can be closed / cancelled in close_stream

/* 
 In custom_providers.yaml. If authenticate value is false, Optuma will not send login or logout request.
*/
app.post('/api/login', async (req, res) => {
  try {
    if (req.headers.authorization) {
      const base64Credentials = req.headers.authorization.split(' ')[1]
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8')
      const [username, password] = credentials.split(':')
      console.log('login ', username, password)
    }

    // const response = await axios.post('https://external-server.com/login', {
    //   username,
    //   password
    // });

    var authenticated = true

    // Check the response from the external server for successful authentication
    if (authenticated) {
      // if (response.data.authenticated) {
      // If authenticated, you can generate a token or session for the user

      // Return a success response
      res.json({ status: '1', message: 'Login successful', token: 'generated_token' })
    } else {
      // If authentication failed
      res.json({ status: '0', message: 'Login error: xxx' })
    }
  } catch (error) {
    // Handle any errors that occurred during the request
    console.error('Error during login:', error)
    res.status(500).json({ message: 'Error during login' })
  }
})

/*
Optuma sends open_stream get request with a list of live symbols
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
app.get('/api/quotes', (req, res) => {
  const { symbols, mics, figis } = req.query
  console.log('open stream ', symbols, ' ', mics, ' ', figis)

  // try {
  //   // Make the GET request to the external server for streaming data
  //   externalStream = axios.get('https://external-server.com/stream', {
  //   responseType: 'stream' // Set the response type to stream
  //   });
  //
  // } catch (error) {
  //   console.error('Error retrieving streaming data:', error);
  //   res.status(500).json({ message: 'Error retrieving streaming data' });
  // }

  // todo - simulation for live data
  const data = sampleTicks
  let time = 200
  for (let index = 0; index < data.length; index++) {
    let bar = data[index]
    setTimeout(() => {
      res.write(JSON.stringify(bar) + '\n')
    }, time)
    time += 200
  }

  // for a continuous live data stream, res.end() might or might not be needed.
  setTimeout(() => {
    res.end()
  }, time)
})

/*
  close stream provides a way to manage the stream resources.

  Optuma does not open a new stream immediately upon close_stream.
  It waits until there is a new code request. Then it kills the previous open_stream request and 
  recreate a new open_stream with a new list of open codes.
*/
app.delete('/api/quotes', async (req, res) => {
  try {
    const { symbol, mic, figi } = req.query

    console.log('close stream ', symbol, ' ', mic, ' ', figi)

    // the following codes are for demo only
    externalStream = true
    if (externalStream) {
      // Close the stream by canceling the request
      // externalStream.cancel()
      externalStream = null

      res.json({ status: 1, message: 'Stream closed successfully' })
    } else {
      res.json({ status: 0, message: 'No active stream to close' })
    }
  } catch (error) {
    console.error('Error closing stream:', error)
    res.status(500).json({ message: 'Error closing stream' })
  }
})

/*
  history request is being sent first when open a chart.
  after the history is completed, then Optuma sends open_stream request

  if last_data_set = 0, it means there is more than one response for the current request.
  when receiving the last response, make sure to set last_data_set = 1
  
  Optuma is able to process each response separately and reflect on the chart.
  symbol in req.query is the unique code that is used to match the source of the request
*/
app.get('/api/history', async (req, res) => {
  try {
    const { symbol, mic, figi, timeframe } = req.query
    // const response = await axios.get('https://external-server.com/history', {
    //   code, mic, figi, handle, timeframe
    // });

    // construct the data response
    // sampleDaily consists an array of history bars
    // format of each bar
    // {
    //   "datetime": "2013-01-04",
    //   "open": 63.07,
    //   "high": 63.08,
    //   "low": 62.74,
    //   "close": 62.98,
    //   "volume": 1650767,
    //   "oi": 0
    // },

    var data = {
      status: 1,
      last_data_set: 1, // to tell this is the last response,
      symbol: symbol,
      bars: sampleDaily,
    }

    // Return the history data
    res.json(data)
  } catch (error) {
    // Handle any errors that occurred during the request
    console.error('Error retrieving history from external API:', error)
    res.status(500).json({ message: 'Error retrieving history data' })
  }
})

/*
  lookup request is sent from the Search By Code dialog in Optuma.
  You can find this option from the right click menu of the custom provider exchange that is listed in the security selector in Optuma.

  In custom_provider.yaml file, if the search_type is empty or missing, then the Search button is disabled.
  It means the client should not be able to send this request.

  You can name and extend the search types.
  type in the req.query is an integer, which is the index of the search types provided in custom_provider.yaml file.

*/
app.get('/api/lookup', (req, res) => {
  try {
    const { search, type } = req.query

    // const response = await axios.get('https://external-server.com/search', {
    //   search
    // });

    // construct the search result
    const listOfCodes = {
      status: 1,
      datasets: [
        {
          code: 'CBA',
          symbol: 'CBA',
          description: 'Commonwealth Bank of Australia',
          exchange: 'ASX',
          assetType: 'equity',
        },
        {
          code: 'ANZ',
          symbol: 'ANZ',
          description: 'Australia and New Zealand Bank',
          exchange: 'ASX',
          assetType: 'equity',
        },
      ],
    }

    // Return the processed data as the API response
    res.json(listOfCodes)
  } catch (error) {
    // Handle any errors that occurred during the request
    console.error('Error retrieving data from external search ticker API:', error)
    res.status(500).json({ message: 'Error retrieving search ticker data' })
  }
})

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
