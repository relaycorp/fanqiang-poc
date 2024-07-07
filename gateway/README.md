# VPN Gateway

## Development

### Instal

- Python 3 with the `distutils` package. On Linux, you can instal it with `sudo apt install python3-setuptools`.
- The server uses raw sockets, which requires elevated privileges.
  To avoid running the server as `root` on UNIX systems,
  run `dev-bin/capability add` to run the server with the `CAP_NET_RAW` [capability](https://linux.die.net/man/7/capabilities).

### Run

Simply run [`dev-bin/run`](dev-bin/run).

### Uninstal

- To remove the `CAP_NET_RAW` capability, run `dev-bin/capability remove`.
