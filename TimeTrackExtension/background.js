/// <reference types="@types/firefox-webext-browser"/>

setInterval(async () => {
  const tabs = await browser.tabs.query({ currentWindow: true, active: true })
  const activeTab = tabs[0]
  console.log(activeTab.url, activeTab.title)
  webSocket.send(JSON.stringify(activeTab))
}, 1000)
const websocketArguments = 'ws://localhost:9000'
const webSocket = new WebSocket(websocketArguments)
console.log({ webSocket })

function onWebSocketMessage(message) {
  console.log('Message: ', message)
}
webSocket.onerror = onWebSocketError
webSocket.onopen = onWebSocketOpen
webSocket.onmessage = onWebSocketMessage

function onError(error) {
  console.log(`Error: ${error}`)
}

function onWebSocketError(event) {
  console.log('WebSocket error observed:', event)
  console.log({ webSocket })
}

function onWebSocketOpen(event) {
  console.log('WebSocket open: ', webSocket.readyState)
  console.log({ webSocket })
}
