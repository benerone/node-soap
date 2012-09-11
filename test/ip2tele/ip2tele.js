var http = require('http')
  , soap = require('node-soap-ly')
  , moment = require('moment')
  , inspect = require('util').inspect
  , url = require('url')
  , path = require('path')
  , ip2tele_client
  , detect
  , cfg = require('./cfg.js')
  ;

if (process.argv[2] || process.argv[2] === 'fake') {
  var endpoint = 'http://127.0.0.1:' + cfg.fake_port + cfg.path + '?wsdl';
  var fake = 'fake';
} else {
  console.log('Usage : node ip2tele.js [fake]');
  console.log('[fake] call fake service instead of the real production server.');
}

soap.createClient(cfg.wsdl_file,
  function(err, client){
    console.log(err);
    if (err) {
      console.log('create client error:')
      console.error(err);
    } else {
      console.log('[client]');
      console.log(client);
      ip2tele_client = client;
      detect = ip2tele_client.QueryUserInfoServiceApply.QueryUserInfoServiceApplyHttpPort.QueryUserInfoServiceApply;
      client.logger_req = function(a, b){
        console.log(a);
        console.log(b);
      };
    }
  },
  endpoint
);

var web_server = http.createServer(function(req, res){
  var cSock = req.connection;
  var sAddr = res.socket.address();
  var QueryUserInfoRequest = {
    'tns:UserInfo' : {
      "tns:IP" : cSock.remoteAddress,
      "tns:Port" : cSock.remotePort,
      'tns:ServerIP' : sAddr.address,
      'tns:ServerPort' : sAddr.port,
      'tns:SessionID' : '',
      'tns:SKey' : ''
    },
    'tns:ServerInfo' : {
      'tns:ServerID' : cfg.ServerID,
      'tns:TimeStamp' : moment().format('YYYYMMDDHHmmss')
    }
  }
  console.log(QueryUserInfoRequest);

  detect(QueryUserInfoRequest, function(err, QueryUserInfoResponse, body){
    if (err) {
      console.log(err);
      console.log(body);
      res.end(err.toString());
      return;
    }
    var path = url.parse(req.url).pathname;
    console.log(QueryUserInfoResponse);
    var tele = QueryUserInfoResponse.UserInfo[0].UserName;
    var loc = 'http://61.181.22.71:81/tjuc/get_tele_b.show_tele?tele=' + tele;
    if (path === '/') {
      res.writeHead(200, {
        'Content-Type' : 'text/html',
        'Transfer-Encoding' : 'chunked'
      });
      res.write('<h2>This is a call to ' + (fake || 'real') + ' ip2tele web service</h2>');
      res.write('<h1>your tele is ' + tele + '</h1>');
      res.write('<br/>your request is <br/>' + inspect(QueryUserInfoRequest));
      res.end('<br/>your response is <br/>' + inspect(QueryUserInfoResponse));
    } else {
      res.writeHead(303, {
        "Location" : loc
      });
      res.end();
    }
  });
});

web_server.listen(cfg.site_port);
