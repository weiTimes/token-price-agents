A simple generator that models stock prices using a Geometric Brownian Motion (GBM) as simple random walk.

The service exposes SSE at http://localhost:3000/stocks/prices

### Installation

```shell
npm install
```

### Run
```
npm run start
```

### Test

In terminal

```
curl -N http://localhost:3000/stocks/prices
```

With code

```
const es = new EventSource('http://localhost:3000/stocks/prices');
es.onmessage = (event) => {
  console.log('Received price update:', event.data);
};
```
