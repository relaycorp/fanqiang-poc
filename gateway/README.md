# VPN Gateway

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

## Copyright notes

This project implements system calls to the Linux kernel,
including header files (e.g. `linux/if_tun.h`) containing the following licence header:

```
/* SPDX-License-Identifier: GPL-2.0+ WITH Linux-syscall-note */
```

The [note `WITH Linux-syscall-note`](https://spdx.org/licenses/Linux-syscall-note.html) excepts calling code from the GPL-2.0+ licence.
