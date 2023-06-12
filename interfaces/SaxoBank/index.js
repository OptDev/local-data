const axios = require('axios')
const fs = require('fs')
const WebSocket = require('ws')
const CryptoJS = require('crypto-js')
require('dotenv').config()

/*
https://www.developer.saxo/openapi/learn/environments

saxobank reference
https://www.developer.saxo/openapi/referencedocs

saxobank oauth
https://www.developer.saxo/openapi/learn/oauth-authorization-code-grant

saxobank AssetType
https://www.developer.saxo/openapi/referencedocs/ref/v1/instruments/getsummaries/7f1a5b8199f43fc1d794ce9e279d8c34/assettype/c9311a0d718a7ee55bd9b386f1514d00

for /api/lookup
https://www.developer.saxo/openapi/referencedocs/ref/v1/instruments
https://openapi.help.saxo/hc/en-us/articles/4416972708625-Can-I-retrieve-ISINs-through-the-OpenAPI-

for /api/history
https://www.developer.saxo/openapi/referencedocs/chart/v1/charts
https://openapi.help.saxo/hc/en-us/articles/4405260778653-How-can-I-get-historical-prices-

for /api/quotes
https://www.developer.saxo/openapi/learn/streaming
https://saxobank.github.io/openapi-samples-js/websockets/realtime-quotes/
*/

// streaming connections
var connections = []

class SaxoBank {
  getAccessTokenDataFromProvider(req, res) {
    const { code, state } = req.query
    const [dataProvider, opUsername] = state.split('.')

    const client_id = process.env.SAXOBANK_OAUTH_CLIENT_ID
    const client_secret = process.env.SAXOBANK_OAUTH_CLIENT_SECRET
    const auth = btoa(client_id + ':' + client_secret)
    const payload = {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.LOCAL_DATA_CALLBACK_URL,
    }
    const config = {
      headers: {
        Authorization: 'Basic ' + auth,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
    axios
      .post(process.env.SAXOBANK_AUTHENTICATION_URL + '/token', payload, config)
      .then((response) => {
        this.#saveAccessTokenData(dataProvider, opUsername, response.data)
        res.send('Authorization successfully granted')
      })
      .catch((error) => {
        console.log(error)
        res.send('Authorization failed')
      })
  }

  async getAccessTokenDataFromLocal(dataProvider, opUsername) {
    const currentTime = Math.round(Date.now() / 1000)
    const accessTokenFile = './data/' + dataProvider + '.' + opUsername + '.dat'
    let accessTokenData = null

    // file exists?
    if (fs.existsSync(accessTokenFile)) {
      // read file and parse
      accessTokenData = JSON.parse(fs.readFileSync(accessTokenFile, 'utf8'))
      // access_token is available ( not expired )
      if (accessTokenData.expiry > currentTime) {
        return accessTokenData
      } else if (accessTokenData.refresh_token_expiry > currentTime) {
        // access_token is expired but refresh_token is not expired
        // get access_token from refresh_token
        accessTokenData = await this.#getAccessTokenFromRefreshToken(accessTokenData.refresh_token)
        if (accessTokenData !== false) {
          // add expiry and refresh_token_expiry for handy
          this.#saveAccessTokenData(dataProvider, opUsername, accessTokenData)
          return accessTokenData
        }
      }
    }

    // send the authorization_url with params to Optuma
    // Optuma will hit the url
    const params = new URLSearchParams({
      response_type: 'code', // Please do not change. It must be 'code'
      client_id: process.env.SAXOBANK_OAUTH_CLIENT_ID,
      state: dataProvider + '.' + opUsername,
      redirect_uri: process.env.LOCAL_DATA_CALLBACK_URL,
    })
    const authFullUrl = process.env.SAXOBANK_AUTHENTICATION_URL + '/authorize?' + params.toString()
    return {
      status: '0',
      errorcode: '990',
      errordesc: authFullUrl,
    }
  }

  async #getAccessTokenFromRefreshToken(refreshToken) {
    const client_id = process.env.SAXOBANK_OAUTH_CLIENT_ID
    const client_secret = process.env.SAXOBANK_OAUTH_CLIENT_SECRET
    const auth = btoa(client_id + ':' + client_secret)
    const payload = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      redirect_uri: process.env.LOCAL_DATA_CALLBACK_URL,
    }
    const headers = {
      headers: {
        Authorization: 'Basic ' + auth,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
    try {
      const response = await axios.post(process.env.SAXOBANK_AUTHENTICATION_URL + '/token', payload, headers)
      return response.data
    } catch (error) {
      // console.log(error)
      return false
    }
  }

  #saveAccessTokenData(dataProvider, opUsername, accessTokenData) {
    const currentTime = Math.round(Date.now() / 1000)
    const accessTokenFile = './data/' + dataProvider + '.' + opUsername + '.dat'

    accessTokenData.expiry = currentTime + accessTokenData.expires_in
    accessTokenData.refresh_token_expiry = currentTime + accessTokenData.refresh_token_expires_in
    fs.writeFileSync(accessTokenFile, JSON.stringify(accessTokenData))
  }

  // This is called setInterval
  refreshAccessToken(accessTokenFile, dataProvider, opUsername) {
    const currentTime = Math.round(Date.now() / 1000)
    const accessTokenData = JSON.parse(fs.readFileSync('./data/' + accessTokenFile, 'utf8'))
    // Is refresh_token available?
    if (accessTokenData.refresh_token_expiry > currentTime) {
      const client_id = process.env.SAXOBANK_OAUTH_CLIENT_ID
      const client_secret = process.env.SAXOBANK_OAUTH_CLIENT_SECRET
      const auth = btoa(client_id + ':' + client_secret)
      const payload = {
        grant_type: 'refresh_token',
        refresh_token: accessTokenData.refresh_token,
        redirect_uri: process.env.LOCAL_DATA_CALLBACK_URL,
      }
      const headers = {
        headers: {
          Authorization: 'Basic ' + auth,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
      // call axios in async mode
      axios
        .post(process.env.SAXOBANK_AUTHENTICATION_URL + '/token', payload, headers)
        .then((response) => {
          console.log('access_token renewed', response.data.access_token)
          this.#saveAccessTokenData(dataProvider, opUsername, response.data)
        })
        .catch((error) => {})
    }
  }

  login(req, res) {
    let { source } = req.query
    source = source.toLowerCase()
    const base64Credentials = req.headers.authorization.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8')
    const opUsername = credentials.split(':')[0]

    // send the authorization_url with params to Optuma
    // Optuma will hit the url
    const params = new URLSearchParams({
      response_type: 'code', // Please do not change. It must be 'code'
      client_id: process.env.SAXOBANK_OAUTH_CLIENT_ID,
      state: source + '.' + opUsername,
      redirect_uri: process.env.LOCAL_DATA_CALLBACK_URL,
    })
    const authFullUrl = process.env.SAXOBANK_AUTHENTICATION_URL + '/authorize?' + params.toString()
    res.json({ status: 1, auth_url: authFullUrl })
  }

  authorize(req, res) {
    let { source } = req.query
    source = source.toLowerCase()
    const base64Credentials = req.headers.authorization.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8')
    const opUsername = credentials.split(':')[0]
    const accessTokenFile = './data/' + source + '.' + opUsername + '.dat'

    // file exists?
    if (fs.existsSync(accessTokenFile)) {
      res.json({ status: 1, auth_url: 'authorized' })
    } else {
      res.json({ status: 0 })
    }
  }

  async lookup(req, res) {
    let instruments = []

    try {
      const { q, type } = req.query
      const params = new URLSearchParams({
        AssetTypes: type ? type : '',
        Keywords: q,
        // ExchangeId: ''
      })
      const url = process.env.SAXOBANK_API_BASE_URL + '/ref/v1/instruments/?' + params.toString()
      const config = {
        headers: {
          Authorization: 'Bearer ' + req.accessTokenData.access_token,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }

      let response = await axios.get(url, config)
      // example of response.data.Data[]
      // {
      //   AssetType: 'CfdOnStock',
      //   CurrencyCode: 'USD',
      //   Description: 'Apple Inc.',
      //   ExchangeId: 'NASDAQ',
      //   GroupId: 76,
      //   Identifier: 211,
      //   IssuerCountry: 'US',
      //   PrimaryListing: 211,
      //   SummaryType: 'Instrument',
      //   Symbol: 'AAPL:xnas',
      //   TradableAs: [ 'CfdOnStock' ]
      // }
      for (let i = 0; i < response.data.Data.length; i++) {
        instruments.push({
          symbol: response.data.Data[i].Identifier,
          exchange: response.data.Data[i].ExchangeId,
          type: response.data.Data[i].AssetType,
          description: response.data.Data[i].Description,
          code: response.data.Data[i].Symbol,
        })
      }

      // Is there more data?
      while (response.data.__next) {
        response = await axios.get(response.data.__next, config)
        for (let i = 0; i < response.data.Data.length; i++) {
          instruments.push({
            symbol: response.data.Data[i].Identifier,
            exchange: response.data.Data[i].ExchangeId,
            type: response.data.Data[i].AssetType,
            description: response.data.Data[i].Description,
          })
        }
      }
    } catch (error) {
      // Handle any errors that occurred during the request
      // console.error('Error retrieving data from external search ticker API:', error)
      // res.status(500).json({ message: 'Error retrieving search ticker data' })
    }

    res.json({ status: 1, datasets: instruments })
  }

  async history(req, res) {
    const { symbol, period, type, start, end } = req.query
    // if period is 1min then hmmm
    const inc = 1000
    const to = new Date().getTime() + 86400 * 1000 * 3 // millisecond ( add 3 days more not to miss today's data )
    const from = new Date(start).getTime()
    const horizon = this.#getHorizonFromPeriod(period)
    let reached = false
    let last_data_set = 0
    let bars = []
    let prevOldestDataDate = false

    res.setHeader('content-type', 'application/json')
    for (let i = to; i > from; i = i - 86400 * 1000 * inc) {
      last_data_set = 0
      bars = []
      try {
        const params = new URLSearchParams({
          AssetType: type,
          Horizon: horizon,
          Uic: symbol,
          // Mode: 'From',
          // Time: new Date(i - 86400 * 1000 * inc).toUTCString(),
          Mode: 'UpTo',
          Time: new Date(i).toUTCString(),
          Count: inc,
        })
        const url = process.env.SAXOBANK_API_BASE_URL + '/chart/v1/charts/?' + params.toString()
        const config = {
          headers: {
            Authorization: 'Bearer ' + req.accessTokenData.access_token,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }

        let response = await axios.get(url, config)
        for (let j = response.data.Data.length - 1; j >= 0; j--) {
          // example of response.data.Data[]
          // {
          //   CloseAsk: 1.12023,
          //   CloseBid: 1.11993,
          //   HighAsk: 1.12241,
          //   HighBid: 1.12221,
          //   LowAsk: 1.11835,
          //   LowBid: 1.11758,
          //   OpenAsk: 1.11872,
          //   OpenBid: 1.11794,
          //   Time: '2019-08-09T00:00:00.000000Z'
          // }
          const dataDateTime = new Date(response.data.Data[j].Time)
          const yyyymmdd = dataDateTime.toISOString().split('T')[0] // get yyyy-mm-dd
          if (start >= yyyymmdd) {
            // reach to start-date so break
            reached = true
            last_data_set = 1
            break
          }
          if (prevOldestDataDate && yyyymmdd >= prevOldestDataDate) {
            // this data is already sent so skip
            continue
          }
          // add bar
          bars.push({
            datetime: yyyymmdd,
            open: response.data.Data[j].OpenBid,
            high: response.data.Data[j].HighBid,
            low: response.data.Data[j].LowAsk,
            close: response.data.Data[j].CloseBid,
            volume: 0,
            oi: 0,
          })
        }
        prevOldestDataDate = bars[bars.length - 1].datetime
      } catch (error) {
        // Handle any errors that occurred during the request
        // console.error('Error retrieving history from external API:', error)
        // res.status(500).json({ message: 'Error retrieving history data' })

        // if there is an error then set last_data_set = 1 and bars = []
        reached = true
        last_data_set = 1
        bars = []
      }

      const data = {
        status: 1,
        last_data_set: last_data_set, // to tell this is the last response,
        symbol: symbol,
        bars: bars,
      }
      res.write(JSON.stringify(data))

      if (reached) {
        break
      }
    }

    res.end()
  }

  openStream(req, res) {
    const contextId = this.#getContextId(req)

    // create WebSocket connection
    const connection = this.#createConnection(req.accessTokenData.access_token, contextId)
    if (connection !== false) {
      connections[contextId] = connection
      // start listener
      connections[contextId].onopen = () => {
        this.#handleSocketOpen()
        // this.#subscribeChartCharts(req, res, contextId)
        this.#subscribeTradePrices(req, res, contextId)
      }
      connections[contextId].onclose = (event) => {
        this.#handleSocketClose(event)
        res.end()
      }
      connections[contextId].onerror = (event) => {
        this.#handleSocketError(event)
      }
      connections[contextId].onmessage = (message) => {
        this.#handleSocketMessage(req, res, message)
      }
    } else {
      res.status(500).json({ message: 'Streaming Connection failed' })
    }
  }

  async closeStream(req, res) {
    const contextId = this.#getContextId(req)
    // await this.#unsubscribeChartCharts(req, res, contextId)
    await this.#unsubscribeTradePrices(req, res, contextId)
    this.#closeSocket(contextId)
    res.status(200).json({ message: 'close stream' })
  }

  async #unsubscribeChartCharts(req, res, contextId) {
    const referenceId = 'ref-cc-' + contextId
    const url = process.env.SAXOBANK_API_BASE_URL + '/chart/v1/charts/subscriptions/' + contextId + '/' + referenceId
    const config = {
      headers: {
        Authorization: 'Bearer ' + req.accessTokenData.access_token,
      },
    }
    await axios
      .delete(url, config)
      .then((res) => {
        console.log('Unsubscribed /chart/v1/charts')
      })
      .catch((err) => {
        // console.log('unsubscribe.err', err.response.data)
      })
  }

  async #unsubscribeTradePrices(req, res, contextId) {
    const referenceId = 'ref-tp-' + contextId
    const url = process.env.SAXOBANK_API_BASE_URL + '/trade/v1/prices/subscriptions/' + contextId + '/' + referenceId
    const config = {
      headers: {
        Authorization: 'Bearer ' + req.accessTokenData.access_token,
      },
    }
    await axios
      .delete(url, config)
      .then((res) => {
        console.log('Unsubscribed /trade/v1/prices')
      })
      .catch((err) => {
        // console.log('unsubscribe.err', err.response.data)
      })
  }

  #closeSocket(contextId) {
    const NORMAL_CLOSURE = 1000
    if (connections[contextId] !== null) {
      connections[contextId].close(NORMAL_CLOSURE) // This will trigger the onclose event
    } else {
      console.error('Connection not active.')
    }
  }

  #subscribeChartCharts(req, res, contextId) {
    const { symbol, period, type, source } = req.query
    const url = process.env.SAXOBANK_API_BASE_URL + '/chart/v1/charts/subscriptions'
    const payload = {
      Arguments: {
        AssetType: type,
        Horizon: this.#getHorizonFromPeriod(period),
        Uic: symbol,
      },
      ContextId: contextId,
      ReferenceId: 'ref-cc-' + contextId,
    }
    const config = {
      headers: {
        Authorization: 'Bearer ' + req.accessTokenData.access_token,
        'Content-Type': 'application/json; charset=utf-8',
      },
    }
    axios
      .post(url, payload, config)
      .then((response) => {
        console.log(response.data)
      })
      .catch((error) => {
        console.log(error.response.data)
      })
  }

  #subscribeTradePrices(req, res, contextId) {
    const { symbol, period, type, source } = req.query
    const url = process.env.SAXOBANK_API_BASE_URL + '/trade/v1/prices/subscriptions'
    const payload = {
      Arguments: {
        AssetType: type,
        Uic: symbol,
      },
      ContextId: contextId,
      ReferenceId: 'ref-tp-' + contextId,
    }
    const config = {
      headers: {
        Authorization: 'Bearer ' + req.accessTokenData.access_token,
        'Content-Type': 'application/json; charset=utf-8',
      },
    }
    axios
      .post(url, payload, config)
      .then((response) => {
        console.log(response.data)
      })
      .catch((error) => {
        console.log(error.response.data)
      })
  }

  #handleSocketOpen() {
    console.log('Streaming connected.')
  }

  #handleSocketClose(event) {
    // Status codes: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
    if (event.wasClean === true) {
      console.log('Streaming disconnected with code ' + event.code + '.') // Most likely 1000 (Normal Closure), or 1001 (Going Away)
    } else {
      console.error('Streaming disconnected with code ' + event.code + '.')
      //   if (demo.getSecondsUntilTokenExpiry(document.getElementById('idBearerToken').value) <= 0) {
      //     window.alert(
      //       'It looks like the socket has been disconnected due to an expired token (error code ' + evt.code + ').'
      //     )
      //   } else if (
      //     window.confirm(
      //       'It looks like the socket has been disconnected, probably due to a network failure (error code ' +
      //         evt.code +
      //         ').\nDo you want to (try to) reconnect?'
      //     )
      //   ) {
      //     createConnection(accessToken, contextId)
      //     startListener(accessToken, contextId)
      //     // Ideally you create a setup where the connection is restored automatically, after a second or so.
      //     // You can do this with an increasing wait time, until a maximum of say 10 retries.
      //     recreateSubscriptions()
      //   }
    }
  }

  #handleSocketError(event) {
    console.error(event)
  }

  #handleSocketMessage(req, res, messageFrame) {
    const contextId = this.#getContextId(req)
    const messages = this.#parseMessageFrame(messageFrame.data)
    messages.forEach(
      function (message, i) {
        switch (message.referenceId) {
          case 'ref-cc-' + contextId:
            // res.write('[chart/v1/charts/subscriptions]\r\n')
            // res.write(JSON.stringify(message.payload, null, 4) + '\r\n')
            // for (let i = 0; i < message.payload.length; i++) {
            //   const ret = {
            //     status: 1,
            //     symbol: req.symbol,
            //     datetime: message.payload[i].Time,
            //     open: message.payload[i].OpenBid,
            //     high: message.payload[i].HighBid,
            //     low: message.payload[i].LowAsk,
            //     close: message.payload[i].CloseBid,
            //     type: 'q',
            //   }
            //   res.write(JSON.stringify(ret, null, 4))
            // }
            // res.flush()
            break
          case 'ref-tp-' + contextId:
            // Quote exists
            if (message.payload.Quote) {
              let ret = {}
              ret.status = 1
              ret.symbo = req.symbol
              ret.datetime = this.#getYmdHis(message.payload.LastUpdated)
              if (message.payload.Quote.Bid) ret.bid = message.payload.Quote.Bid
              if (message.payload.Quote.Ask) ret.ask = message.payload.Quote.Ask
              if (message.payload.Quote.BidSize) ret.bidsize = message.payload.Quote.BidSize
              if (message.payload.Quote.AskSize) ret.asksize = message.payload.Quote.AskSize
              ret.type = 'q'
              // req.query.nl is for test in a browser.
              res.write(JSON.stringify(ret) + (req.query.nl ? '\r\n' : ''))
            }
            // PriceInfoDetails exists
            if (message.payload.PriceInfoDetails) {
              let ret = {}
              ret.status = 1
              ret.symbo = req.symbol
              ret.datetime = this.#getYmdHis(message.payload.LastUpdated)
              if (message.payload.PriceInfoDetails.LastTraded) ret.close = message.payload.PriceInfoDetails.LastTraded
              if (message.payload.PriceInfoDetails.LastTradedSize)
                ret.size = message.payload.PriceInfoDetails.LastTradedSize
              if (message.payload.PriceInfoDetails.Volume) ret.volume = message.payload.PriceInfoDetails.Volume
              ret.type = 't'
              res.write(JSON.stringify(ret) + (req.query.nl ? '\r\n' : ''))
            }
            // PriceInfoDetails and PriceInfo exist
            if (message.payload.PriceInfoDetails && message.payload.PriceInfo) {
              let ret = {}
              ret.status = 1
              ret.symbo = req.symbol
              ret.datetime = this.#getYmdHis(message.payload.LastUpdated)
              if (message.payload.PriceInfoDetails.Open) ret.open = message.payload.PriceInfoDetails.Open
              if (message.payload.PriceInfoDetails.LastClose) ret.close = message.payload.PriceInfoDetails.LastClose
              if (message.payload.PriceInfo.High) ret.high = message.payload.PriceInfo.High
              if (message.payload.PriceInfo.Low) ret.low = message.payload.PriceInfo.Low
              ret.type = 's'
              res.write(JSON.stringify(ret) + (req.query.nl ? '\r\n' : ''))
            }
            break
          case '_heartbeat':
            res.write(JSON.stringify({ status: 1, heartbeat: 1 }) + (req.query.nl ? '\r\n' : ''))
            // // https://www.developer.saxo/openapi/learn/plain-websocket-streaming#PlainWebSocketStreaming-Controlmessages
            // handleHeartbeat(message.messageId, message.payload)
            break
          case '_resetsubscriptions':
            // close stream
            this.closeStream(req, res)

            // // https://www.developer.saxo/openapi/learn/plain-websocket-streaming#PlainWebSocketStreaming-Controlmessages
            // // The server is not able to send messages and client needs to reset subscriptions by recreating them.
            // console.error(
            //   'Reset Subscription Control message received! Reset your subscriptions by recreating them.\n\n' +
            //     JSON.stringify(message.payload, null, 4)
            // )
            // recreateSubscriptions() // When the TargetReferenceIds array contains elements, this can be done in a more efficient way, by only resubscribing to the referenced subscriptions.
            break
          case '_disconnect':
            // close stream
            this.closeStream(req, res)

            // // https://www.developer.saxo/openapi/learn/plain-websocket-streaming#PlainWebSocketStreaming-Controlmessages
            // // The server has disconnected the client. This messages requires you to re-authenticate if you wish to continue receiving messages.
            // console.error(
            //   'The server has disconnected the client! New login is required.\n\n' +
            //     JSON.stringify(message.payload, null, 4)
            // )
            break
          default:
            console.log('Unknown referenceId = ' + message.referenceId)
            break
        }
      }.bind(this)
    )
  }

  /**
   * Creates a Long from its little endian byte representation (function is part of long.js - https://github.com/dcodeIO/long.js).
   * @param {!Array.<number>} bytes Little endian byte representation
   * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
   * @returns {number} The corresponding Long value
   */
  #fromBytesLe(bytes, unsigned) {
    const low = bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24) | 0
    const high = bytes[4] | (bytes[5] << 8) | (bytes[6] << 16) | (bytes[7] << 24) | 0
    const twoPwr16Dbl = 1 << 16
    const twoPwr32Dbl = twoPwr16Dbl * twoPwr16Dbl
    if (unsigned) {
      return (high >>> 0) * twoPwr32Dbl + (low >>> 0)
    }
    return high * twoPwr32Dbl + (low >>> 0)
  }

  /**
   * Parse the incoming messages. Documentation on message format: https://www.developer.saxo/openapi/learn/plain-websocket-streaming#PlainWebSocketStreaming-Receivingmessages
   * @param {Object} data The received stream message
   * @returns {Array.<Object>} Returns an array with all incoming messages of the frame
   */
  #parseMessageFrame(data) {
    const message = new DataView(data)
    const utf8Decoder = new TextDecoder()
    const parsedMessages = []
    let index = 0
    let messageId
    let referenceIdSize
    let referenceIdBuffer
    let referenceId
    let payloadFormat
    let payloadSize
    let payloadBuffer
    let payload
    while (index < data.byteLength) {
      /* Message identifier (8 bytes)
       * 64-bit little-endian unsigned integer identifying the message.
       * The message identifier is used by clients when reconnecting. It may not be a sequence number and no interpretation
       * of its meaning should be attempted at the client.
       */
      messageId = this.#fromBytesLe(new Uint8Array(data, index, 8))
      index += 8
      /* Version number (2 bytes)
       * Ignored in this example. Get it using 'messageEnvelopeVersion = message.getInt16(index)'.
       */
      index += 2
      /* Reference id size 'Srefid' (1 byte)
       * The number of characters/bytes in the reference id that follows.
       */
      referenceIdSize = message.getInt8(index)
      index += 1
      /* Reference id (Srefid bytes)
       * ASCII encoded reference id for identifying the subscription associated with the message.
       * The reference id identifies the source subscription, or type of control message (like '_heartbeat').
       */
      referenceIdBuffer = new Int8Array(data, index, referenceIdSize)
      referenceId = String.fromCharCode.apply(String, referenceIdBuffer)
      index += referenceIdSize
      /* Payload format (1 byte)
       * 8-bit unsigned integer identifying the format of the message payload. Currently the following formats are defined:
       *  0: The payload is a UTF-8 encoded text string containing JSON.
       *  1: The payload is a binary protobuffer message.
       * The format is selected when the client sets up a streaming subscription so the streaming connection may deliver a mixture of message format.
       * Control messages such as subscription resets are not bound to a specific subscription and are always sent in JSON format.
       */
      payloadFormat = message.getUint8(index)
      index += 1
      /* Payload size 'Spayload' (4 bytes)
       * 32-bit unsigned integer indicating the size of the message payload.
       */
      payloadSize = message.getUint32(index, true)
      index += 4
      /* Payload (Spayload bytes)
       * Binary message payload with the size indicated by the payload size field.
       * The interpretation of the payload depends on the message format field.
       */
      payloadBuffer = new Uint8Array(data, index, payloadSize)
      payload = null
      switch (payloadFormat) {
        case 0:
          // JSON
          try {
            payload = JSON.parse(utf8Decoder.decode(payloadBuffer))
          } catch (error) {
            console.error(error)
          }
          break
        case 1:
          // ProtoBuf
          console.error('Protobuf is not covered by this sample')
          break
        default:
          console.error('Unsupported payloadFormat: ' + payloadFormat)
      }
      if (payload !== null) {
        parsedMessages.push({
          messageId: messageId,
          referenceId: referenceId,
          payload: payload,
        })
      }
      index += payloadSize
    }
    return parsedMessages
  }

  #createConnection(accessToken, contextId) {
    // const url = 'https://streaming.saxobank.com/sim/openapi/streamingws/connect?contextId=' + contextId
    const url =
      process.env.SAXOBANK_WEB_SOCKET_URL +
      '/connect' +
      '?authorization=' +
      encodeURIComponent('BEARER ' + accessToken) +
      '&contextId=' +
      contextId
    try {
      const connection = new WebSocket(url)
      connection.binaryType = 'arraybuffer'
      // console.log(
      //   "Connection created with binaryType '" + connection.binaryType + "'. ReadyState: " + connection.readyState + '.'
      // )
      return connection
      // Documentation on readyState: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
      // 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
    } catch (error) {
      console.error('Error creating websocket. ' + error)
      return false
    }
  }

  #getHorizonFromPeriod(period) {
    switch (period) {
      case '1min':
        return 1
      case 'day':
        return 1440
      case 'week':
        return 10080
      case 'month':
        return 43200
    }
  }

  #getContextId(req) {
    const { symbol, period, type, source } = req.query
    const contextId = CryptoJS.MD5(source + '.' + req.opUsername + '.' + type + '.' + symbol).toString()
    return contextId
  }

  #getYmdHis(dateString) {
    const formattedDate = dateString.replace('T', ' ').slice(0, -4)
    return formattedDate
  }

  #krsort(obj) {
    const sortedArray = Object.entries(obj).sort(([keyA], [keyB]) => {
      if (keyA < keyB) return 1
      if (keyA > keyB) return -1
      return 0
    })

    return Object.fromEntries(sortedArray)
  }
}
module.exports = SaxoBank
