# VPN Gateway

## Development

### Instal

Prerequisites:

- Linux system.
- Python 3 with the `distutils` package. On Linux, you can instal it with `sudo apt install python3-setuptools`.
- To create and configure the TUN device, run `dev-bin/tun up`.

Finally, run:

```bash
npm install
```

### Run

Simply run `npm start`.

### Uninstal

- To remove the TUN device, run `dev-bin/tun down`.

## Copyright notes

This project implements system calls to the Linux kernel,
including header files (e.g. `linux/if_tun.h`) containing the following licence header:

```
/* SPDX-License-Identifier: GPL-2.0+ WITH Linux-syscall-note */
```

The [note `WITH Linux-syscall-note`](https://spdx.org/licenses/Linux-syscall-note.html) excepts calling code from the GPL-2.0+ licence.
