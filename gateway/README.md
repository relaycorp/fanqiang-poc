# VPN Gateway

The VPN Gateway is a server that forwards packets between a WebSockets-based tunnel and the Internet.

## Architecture

Instead of implementing a user-space, port-restricted cone NAT,
the gateway delegates the bulk of the NAT functionality to the Linux kernel for
expediency, simplicity, security, performance and robustness.

A caveat to this is that,
to prevent spoofing attacks,
we must allocate each client a dedicated TUN interface and respective subnet,
and implement a trivial _source NAT_ in user-space.
This places a limit on the number of simultaneous clients,
which this PoC caps at 5 for simplicity;
in practice,
this number could be in the hundreds or thousands depending on available resources.

TUN interfaces are allocated on demand and deallocated after the client disconnects,
although in production we'll want to keep the allocation for a few more seconds in case the client reconnects
(they may have just switched Wi-Fi networks, for example).
TUN interfaces are created and configured upfront,
as that requires elevated privileges.

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

One way to quickly test the server is to run `npm run ping 1.1.1.1` to ping `1.1.1.1`.

## Implementation notes

- Packets are processed in a mutable manner to keep RAM usage low.
  For example, when forwarding a packet,
  its source/destination IP address are rewritten in place to avoid duplicating the packet.

## Missing features

An eventual production implementation should:

- Configure Netfilter NAT timeouts to values low enough that we can reuse TUN interfaces (and their respective subnets) after a short period of inactivity.
  See `sudo sysctl -a | grep -E 'nf_.+timeout'`.
- Use multiple processes to leverage multiple CPU cores.

## Copyright notes

This project uses libraries from the Linux kernel (e.g. `linux/if_tun.h`),
which contain the following licence note:

```
/* SPDX-License-Identifier: GPL-2.0+ WITH Linux-syscall-note */
```

The [note `WITH Linux-syscall-note`](https://spdx.org/licenses/Linux-syscall-note.html) exempts calling code from the GPL-2.0+ licence.
