#!/usr/bin/env node
const dgram = require('dgram');
const os = require('os');

function getBroadcastAddrs() {
  const ifaces = os.networkInterfaces();
  const broadcasts = [];
  Object.values(ifaces).forEach(list => {
    list.forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        const ip = iface.address.split('.').map(Number);
        const mask = iface.netmask.split('.').map(Number);
        const bcast = ip.map((b,i) => (b & mask[i]) | (~mask[i] & 0xFF)).join('.');
        broadcasts.push(bcast);
      }
    });
  });
  broadcasts.push('255.255.255.255');
  return [...new Set(broadcasts)];
}

function discoverController({ timeout = 5000, multiple = true } = {}) {
  return new Promise((resolve) => {
    const socket = dgram.createSocket('udp4');
    const results = [];

    socket.on('error', err => {
      console.error('[NHC2 DISCOVERY] Error:', err);
      socket.close();
      resolve([]);
    });

    socket.on('message', (msg, rinfo) => {
      if (msg.length === 25 && msg[0] === 0x44) {
        const serial = msg.readUInt32LE(2);
        const mac = Array.from(msg.slice(2,6)).map(b => b.toString(16).padStart(2,'0').toUpperCase()).join('');
        const ip = `${msg[6]}.${msg[7]}.${msg[8]}.${msg[9]}`;
        const submask = `${msg[10]}.${msg[11]}.${msg[12]}.${msg[13]}`;
        const major = msg.readUInt16LE(17);
        const minor = msg.readUInt16LE(19);
        const bugfix = msg.readUInt16LE(21);
        const build = msg.readUInt16LE(23);
        const version = `${major}.${minor}.${bugfix}.${build}`;

        if (!results.find(c => c.mac === mac)) {
          const info = { serial, mac, ip, submask, version };
          results.push(info);
          console.log(`[NHC2 DISCOVERY] Found controller: ${JSON.stringify(info, null, 2)}`);
        }
      }
    });

    socket.bind(() => {
      socket.setBroadcast(true);
      const buf = Buffer.from([0x44]);
      getBroadcastAddrs().forEach(addr => {
        socket.send(buf, 0, buf.length, 10000, addr, err => {
          if (err) console.error(`[NHC2 DISCOVERY] Error sending to ${addr}:`, err);
        });
      });
    });

    setTimeout(() => {
      socket.close();
      resolve(multiple ? results : results[0] || null);
    }, timeout);
  });
}

module.exports = { discoverController };
