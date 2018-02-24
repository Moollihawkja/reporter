/*
TODOS:
- FIX cors issue and deploy to bogoin.herokuapp.com
✅ TEST on http://nether.space/reporter.html to see if we can post
❌ TEST on 상태.com to see if cors is really working
✅ Update Nether.Space to:
	✅ send a key from local storage inside the header
	- 
✅ Add logic to block requests using the wrong keys (Make sure we put a timer on this)
- Add cors to the route, and only allow from nether space for now
- Structure the response in a way that plot.ly likes
 */

var express = require('express')
	, bodyParser = require('body-parser')
	, cors = require('cors')
	, http = require('http')
	, async = require('async')
	, mongoose = require('mongoose')
	, loanAppModels = require('@autofidev/models')
	, PandaModels = require('@autofidev/panda-models')
	, encrypt = require('@autofidev/encrypt')
	, configs = require('./_config.json')
	, _ = require('lodash')
;

console.log();

var app = express()
	, dbs = {
		local: {
			uri: process.env.MONGO_DB_l || configs.dbUri_l
			, port: 3270
			, encryption: encrypt('4uWhEm+%9#_wT6UM=ngC4@n+R6KF7P')
		}
		, staging: {
			uri: process.env.MONGO_DB_s || configs.dbUri_s
			, port: 3271
			, encryption: encrypt('HJ0Zxu))Jj%gJ_t7ys)0U&p5;./ib=')
		}
		, production: {
			uri: process.env.MONGO_DB_f || configs.dbUri_f
			, port: 3272
			, encryption: encrypt('4uWhEm+%9#_wT6UM=ngC4@n+R6KF7P')
		}
		, panda: {
			uri: process.env.MONGO_DB_panda || configs.pandaDbUri
			, port: 3273
			, encryption: encrypt('4uWhEm+%9#_wT6UM=ngC4@n+R6KF7P')
		}
	}
	, env = dbs[process.argv[2] || 'production']
	
;

if (mongoose.connection.readyState !== 1) {
	mongoose.connect(env.uri, {useMongoClient: true});
}

function convertDates(obj) {
	if(!obj) return;
	if(typeof(obj) !== 'object') return;
	if(Array.isArray(obj)) {
		obj.forEach(i => {
			convertDates(i)
		})
	}
	Object.keys(obj).forEach(k => {
		if(!obj[k]) return;
		if(typeof(obj[k] === 'string')) {
			if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(obj[k])) {
				obj[k] = new Date(obj[k])
			}
		} 
		if(typeof(obj[k]) === 'object') {
			convertDates(obj[k])
		}
	})
}

function decrypt(obj, keys) {
	if(!obj) return;
	if(Array.isArray(obj)) {
		obj.forEach(i => decrypt(i, keys));
		return;
	}
	if(typeof(obj) !== 'object') return;
	keys.forEach(key => {
		var val = _.get(obj, key);
		if(!val) return;
		_.set(obj, key, env.encryption.decrypt(val))
	});
}


app.use(bodyParser.json({limit: '16mb'}));

app.set('port', env.port);

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

app.use(function(req,res,next) {
	if(req.hostname === 'localhost') return next();
	if(req.headers.secret === configs.secret)
		return next();
	res.status(401);
	res.send('Not Authorized');
})


app.options('/query', cors(), (req, res, next) => {
	res.send();
})
app.post('/query', cors(), (req, res, next) => {
	if(!req || !req.body) return res.send('BAD');

	var results = []
		, request = req.body
		, keysToDecrypt = request.decrypt ? Object.assign({}, request.decrypt) : []
	;
	delete request.decrypt;

	convertDates(request);
	async.eachSeries(Object.keys(request), function(key, cb) {
		
		var system = request[key].system
			, models = system === 'panda' ? pandaModels : loanAppModels;
		delete request[key].system;

		if(!models[key]) return cb();
		var cmd = models[key]
			, actions = request[key]
		;

		Object.keys(actions).forEach(action => {
			console.log('Action', action)
			if(action === 'exec' || !cmd[action]) return;
			cmd = cmd[action](actions[action]);
		})
		cmd.exec(function(err, resp) {
			if(err) console.log('error', err)
			if(resp && keysToDecrypt && keysToDecrypt.keys && keysToDecrypt.keys.length) decrypt(resp, keysToDecrypt.keys);
			results.push(err || resp);
			cb(err, resp);
		});
	}, function(err) {
		res.send(err || results);
	})
	
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

server.listen(env.port);

