# VPN Gateway

The VPN Gateway is a server that forwards packets between a tunnel and the Internet, via a TUN device.

## Architecture

- Translation method: Port-restricted cone NAT for compatibility with P2P protocols.

## Development

### Instal

Prerequisites:

- A Debian-based system. This may or may not work on other Linux distributions.
- Python 3 with the `distutils` package. On Ubuntu, you can instal it with `sudo apt install python3-setuptools`.

Finally, run:

```bash
npm install
```

### Run

You have to create and configure the TUN device with `dev-bin/tun up` before starting the server.
When you no longer need the server, run `dev-bin/tun down`.

To start the server, simply run `npm start`.

One way to quickly test the server is to run `npm run ping` to ping `1.1.1.1`.

## Implementation notes

- Packets are processed in a mutable manner to keep RAM usage low.
  For example, when forwarding a packet,
  its source/destination IP address and port are rewritten in place to avoid duplicating the packet.

## Missing features

An eventual production implementation should support:

- Transport protocols other than TCP and UDP.
  Specifically,
  protocols whose data units contain source and destination ports to facilitate NAT traversal.
  For example, SCTP and DCCP, but not ICMP or IL.

## Copyright notes

This project uses libraries from the Linux kernel (e.g. `linux/if_tun.h`),
which contain the following licence note:

```
/* SPDX-License-Identifier: GPL-2.0+ WITH Linux-syscall-note */
```

The [note `WITH Linux-syscall-note`](https://spdx.org/licenses/Linux-syscall-note.html) exempts calling code from the GPL-2.0+ licence.
