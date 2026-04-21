const ws = new WebSocket(`ws://${window.location.host}`);

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  
  
  if(msg.type === 'dirs'){
  const app = document.getElementById('app');
  const div = document.createElement('div');
  div.textContent = msg.data;
  app.appendChild(div);

  }
  
  else if(msg.type === 'files'){
    const app = document.getElementById('app');
    const div = document.createElement('div');
    div.textContent = msg.data;
    app.appendChild(div);
  }
  
  else if(msg.type === 'images'){

    const app = document.getElementById('app');
    const img = document.createElement('img')
    img.src = 'data:image/jpeg;base64,' + msg.data;
    app.appendChild(img);

  }

};


ws.onopen = () => {
  console.log('Connected to server');
};