// process.stdout.write('\033c'); // clear the screen
const tap = require('tap');
const test = require('tap-only');
const path = require('path');
const request = require('request');
const app = require('../../lib');
const root = __dirname;

const { port, localPort: servicePort, resetConfig } = require('../utils')(tap);

test('internal sends request through client', t => {

  // same setup as normal
  process.chdir(path.resolve(root, '../fixtures/server'));
  process.env.ACCEPT = 'filters.json';
  process.env.PORT = servicePort;
  process.env.BROKER_TYPE = 'server';
  const serverPort = port();
  const server = app.main({ port: serverPort });

  process.chdir(path.resolve(root, '../fixtures/client'));
  process.env.BROKER_URL = `http://localhost:${serverPort}`;
  process.env.BROKER_ID = '12345';
  process.env.BROKER_TYPE = 'client';
  const localPort = port();
  // invalidate the config require
  resetConfig();
  const client = app.main({ port: localPort });

  // wait for the client to successfully connect to the server and identify itself
  server.io.once('connection', socket => {
    socket.once('identify', () => {
      t.plan(2);

      t.test('client can forward requests FROM internal service', t => {
        const url = `http://localhost:${localPort}/service/test1`;
        request({ url, method: 'get', json: true }, (err, res) => {
          t.equal(res.statusCode, 200, '200 statusCode');
          t.equal(res.body, 'test1', 'body correct');
          t.end();
        });
      });

      t.test('clean up', t => {
        client.close();
        setTimeout(() => {
          server.close();
          t.ok('sockets closed');
          t.end();
        }, 100);
      });
    });
  });
});
