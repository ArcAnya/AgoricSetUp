// @ts-check
import { test } from 'tape-promise/tape';
import { producePromise } from '@agoric/produce-promise';
import rawHarden from '@agoric/harden';

import {
  parse,
  unparse,
  makeEchoConnectionHandler,
  makeLoopbackInterfaceHandler,
  makeNetworkInterface,
  makeRouter,
} from '../src/vats/network';

const harden = /** @type {<T>(data: T) => T} */ (rawHarden);

// eslint-disable-next-line no-constant-condition
const log = false ? console.log : () => {};

/**
 * @param {*} t
 * @returns {import('../src/vats/network').InterfaceHandler} A testing handler
 */
const makeInterfaceHandler = t => {
  /**
   * @type {import('../src/vats/network').ListenHandler}
   */
  let l;
  let lp;
  return harden({
    async onCreate(_interface, _impl) {
      log('created', _interface, _impl);
    },
    async onConnect(port, localAddr, remoteAddr) {
      t.assert(port, `port is tracked in onConnect`);
      t.assert(localAddr, `local address is supplied to onConnect`);
      t.assert(remoteAddr, `remote address is supplied to onConnect`);
      // console.log('connected', localAddr, remoteAddr, l);
      if (lp) {
        return l.onAccept(lp, localAddr, remoteAddr, l);
      }
      return makeEchoConnectionHandler();
    },
    async onListen(port, localAddr, listenHandler) {
      t.assert(port, `port is tracked in onListen`);
      t.assert(localAddr, `local address is supplied to onListen`);
      t.assert(listenHandler, `listen handler is tracked in onListen`);
      lp = port;
      l = listenHandler;
      log('listening', port.getLocalAddress(), listenHandler);
    },
    async onListenRemove(port, localAddr, listenHandler) {
      t.assert(port, `port is tracked in onListen`);
      t.assert(localAddr, `local address is supplied to onListen`);
      t.equals(listenHandler, l, `listenHandler is tracked in onListenRemove`);
      l = undefined;
      lp = undefined;
      log('port done listening', port.getLocalAddress());
    },
    async onRevoke(port, localAddr) {
      t.assert(port, `port is tracked in onRevoke`);
      t.assert(localAddr, `local address is supplied to onRevoke`);
      log('port done revoking', port.getLocalAddress());
    },
  });
};

test('handled iface', async t => {
  try {
    const iface = makeNetworkInterface(makeInterfaceHandler(t));

    const closed = producePromise();
    const port = await iface.bind('/ibc/*/ordered');
    await port.connect(
      '/ibc/*/ordered/echo',
      harden({
        async onOpen(connection) {
          const ack = await connection.send('ping');
          // log(ack);
          t.equals(`${ack}`, 'ping', 'received pong');
          connection.close();
        },
        async onClose(_connection, reason) {
          t.equals(reason, undefined, 'no close reason');
          closed.resolve();
        },
        async onReceive(_connection, bytes) {
          t.equals(`${bytes}`, 'ping');
          return 'pong';
        },
      }),
    );
    await closed.promise;
    await port.revoke();
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

test('iface connection listen', async t => {
  try {
    const iface = makeNetworkInterface(makeInterfaceHandler(t));

    const closed = producePromise();

    const port = await iface.bind('/net/ordered/ordered/some-portname');

    /**
     * @type {import('../src/vats/network').ListenHandler}
     */
    const listener = harden({
      async onListen(p, listenHandler) {
        t.equals(p, port, `port is tracked in onListen`);
        t.assert(listenHandler, `listenHandler is tracked in onListen`);
      },
      async onAccept(p, localAddr, remoteAddr, listenHandler) {
        t.assert(localAddr, `local address is passed to onAccept`);
        t.assert(remoteAddr, `remote address is passed to onAccept`);
        t.equals(p, port, `port is tracked in onAccept`);
        t.equals(
          listenHandler,
          listener,
          `listenHandler is tracked in onAccept`,
        );
        let handler;
        return harden({
          async onOpen(connection, connectionHandler) {
            t.assert(
              connectionHandler,
              `connectionHandler is tracked in onOpen`,
            );
            handler = connectionHandler;
            const ack = await connection.send('ping');
            t.equals(`${ack}`, 'ping', 'received pong');
            connection.close();
          },
          async onClose(c, reason, connectionHandler) {
            t.equals(
              connectionHandler,
              handler,
              `connectionHandler is tracked in onClose`,
            );
            handler = undefined;
            t.assert(c, 'connection is passed to onClose');
            t.equals(reason, undefined, 'no close reason');
            closed.resolve();
          },
          async onReceive(c, packet, connectionHandler) {
            t.equals(
              connectionHandler,
              handler,
              `connectionHandler is tracked in onReceive`,
            );
            t.assert(c, 'connection is passed to onReceive');
            t.equals(`${packet}`, 'ping', 'expected ping');
            return 'pong';
          },
        });
      },
      async onError(p, rej, listenHandler) {
        t.equals(p, port, `port is tracked in onError`);
        t.equals(
          listenHandler,
          listener,
          `listenHandler is tracked in onError`,
        );
        t.isNot(rej, rej, 'unexpected error');
      },
      async onRemove(p, listenHandler) {
        t.equals(
          listenHandler,
          listener,
          `listenHandler is tracked in onRemove`,
        );
        t.equals(p, port, `port is passed to onReset`);
      },
    });

    await port.addListener(listener);

    const port2 = await iface.bind('/net/ordered');
    const connectionHandler = makeEchoConnectionHandler();
    await port2.connect(
      '/net/ordered/ordered/some-portname',
      harden({
        ...connectionHandler,
        async onOpen(connection, c) {
          if (connectionHandler.onOpen) {
            await connectionHandler.onOpen(connection, c);
          }
          connection.send('ping');
        },
      }),
    );

    await closed.promise;

    await port.removeListener(listener);
    await port.revoke();
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

test.skip('loopback iface', async t => {
  try {
    const iface = makeNetworkInterface(makeLoopbackInterfaceHandler());

    const closed = producePromise();

    const port = await iface.bind('/loopback/foo');

    /**
     * @type {import('../src/vats/network').ListenHandler}
     */
    const listener = harden({
      async onAccept(_p, _localAddr, _remoteAddr, _listenHandler) {
        return harden({
          async onReceive(c, packet, _connectionHandler) {
            t.equals(`${packet}`, 'ping', 'expected ping');
            t.equals(`${await c.send('pong')}`, 'pongack', 'expected pongack');
            return 'pingack';
          },
        });
      },
    });
    await port.addListener(listener);

    const port2 = await iface.bind('/loopback/bar');
    await port2.connect(
      port.getLocalAddress(),
      harden({
        async onOpen(c, _connectionHandler) {
          t.equals(`${await c.send('ping')}`, 'pingack', 'expected pingack');
        },
        async onReceive(c, packet, _connectionHandler) {
          t.equals(`${packet}`, 'pong', 'expected pong');
          Promise.resolve().then(() => c.close());
          return 'pongack';
        },
      }),
    );

    await closed.promise;

    await port.removeListener(listener);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

test('routing', async t => {
  try {
    const router = makeRouter();
    t.deepEquals(router.getRoutes('/if/local'), [], 'get routes matches none');
    router.register('/if/', 'a');
    t.deepEquals(
      router.getRoutes('/if/foo'),
      [['/if/', 'a']],
      'get routes matches prefix',
    );
    router.register('/if/foo', 'b');
    t.deepEquals(
      router.getRoutes('/if/foo'),
      [
        ['/if/foo', 'b'],
        ['/if/', 'a'],
      ],
      'get routes matches all',
    );
    t.deepEquals(
      router.getRoutes('/if/foob'),
      [['/if/', 'a']],
      'get routes needs separator',
    );
    router.register('/ibc/*/ordered', 'c');
    t.deepEquals(
      router.getRoutes('/if/foo'),
      [
        ['/if/foo', 'b'],
        ['/if/', 'a'],
      ],
      'get routes avoids nonmatching paths',
    );
    t.deepEquals(
      router.getRoutes('/ibc/*/ordered'),
      [['/ibc/*/ordered', 'c']],
      'direct match',
    );
    t.deepEquals(
      router.getRoutes('/ibc/*/ordered/zot'),
      [['/ibc/*/ordered', 'c']],
      'prefix matches',
    );
    t.deepEquals(router.getRoutes('/ibc/*/barfo'), [], 'no match');

    t.throws(
      () => router.unregister('/ibc/*/ordered', 'a'),
      /Router is not registered/,
      'unregister fails for no match',
    );
    router.unregister('/ibc/*/ordered', 'c');
    t.deepEquals(
      router.getRoutes('/ibc/*/ordered'),
      [],
      'no match after unregistration',
    );
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

test('multiaddr', async t => {
  try {
    t.deepEquals(parse('/if/local'), [['if', 'local']]);
    t.deepEquals(parse('/zot'), [['zot']]);
    t.deepEquals(parse('/zot/foo/bar/baz/bot'), [
      ['zot', 'foo'],
      ['bar', 'baz'],
      ['bot'],
    ]);
    for (const str of ['', 'foobar']) {
      t.throws(
        () => parse(str),
        /Error parsing Multiaddr/,
        `expected failure of ${str}`,
      );
    }
    for (const str of [
      '/',
      '//',
      '/foo',
      '/foobib/bar',
      '/k1/v1/k2/v2/k3/v3',
    ]) {
      t.equals(
        unparse(parse(str)),
        str,
        `round-trip of ${JSON.stringify(str)} matches`,
      );
    }
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
