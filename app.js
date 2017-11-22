/*
TODOS:
- Deploy to heroku
- TEST on 상태.com to see if cors is really working
- Add logic to block requests using the wrong keys (Make sure we put a timer on this)
- Add cors to the route, and only allow from nether space for now
- Structure the response in a way that plot.ly likes
 */

var express = require('express')
	, bodyParser = require('body-parser')
	, cors = require('cors')
	, http = require('http')
	, _ = require('lodash')
;

var app = express()
	, port = parseInt(process.env.PORT || '3272')
;

app.use(bodyParser.json({limit: '16mb'}));

app.set('port', port);

app.get('/', (req, res, next) => {
	res.send('OK');
});

app.use(cors(function(req, cb) {
	var corsOptions = { origin: false };
	(process.env.WHITE_LIST || '')
		.split(',')
		.map(u => u.trim())
		.forEach(function(requestPath) {
			if (_.get(req, 'originalUrl', '').indexOf(requestPath) !== -1) {
				corsOptions.origin = '*';
			}
		})
	;

	cb(null, corsOptions);
}));


app.options('/query', cors(), (req, res, next) => {
	res.send(req.body);
})
app.post('/query', cors(), (req, res, next) => {
	res.send(req.body);
})

var server = http.createServer(app);

server.on('listening', () => {
	var addr = server.address()
		, bind = typeof addr === 'string'
			? 'pipe ' + addr
			: 'port ' + addr.port
	;
	console.log('Listening on ' + bind);	
});

server.listen(port);

