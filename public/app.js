const ws = new WebSocket(`ws://${window.location.host}`);

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log(msg.type, msg.data);
  // TODO: update UI
};

ws.onopen = () => {
  console.log('Connected to server');
};