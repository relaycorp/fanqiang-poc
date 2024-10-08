# Fān Qiáng Proof of Concept

This is the Proof of Concept (PoC) of _Fān Qiáng_ (翻墙),
a VPN tunnelling protocol that will mitigate:

- **Active probing**, by using existing HTTPS websites to obfuscate traffic, as opposed to purpose-built Application Layer protocols that can be identified by the most sophisticated firewalls (e.g. [China's](https://en.wikipedia.org/wiki/Great_Firewall#Active_probing)).
- **Enumeration**, by giving website operators a trivial and universal method to turn literally any website into a tunnel,
  along with incentives to do so.
  We'll also limit the set of tunnels that any given user can see.
  This way, censors couldn't discover most/all tunnels like they can with [Tor bridges](https://github.com/scriptzteam/Tor-Bridges-Collector) and commercial VPNs.
- **Fingerprinting**, by making the TLS handshake look like that of a mainstream web browser and the traffic devoid of VPN-specific patterns.

In other words,
whilst censors could still find ways to uncover individual tunnels,
any subsequent blocking or monitoring would impact a small fraction of the user base.

## Testing

We tested this PoC from several vantage points around the world,
including the following Autonomous Systems (ASes),
using a tunnel on Google Cloud Platform (GCP):

- China: China Unicom (AS4837) and China Telecom (AS4134). It worked as expected.
- Iran: Mobile Communication Company of Iran (AS197207). It didn't work because Google blocks connections from Iran. We might try rerunning the tests with a tunnel hosted elsewhere.
- Russia: Rostelecom (AS12389). It worked as expected.

You, too, can test this PoC by following these steps:

1. Deploy the [gateway](./gateway) to GCP.
2. Turn an existing website into a tunnel. Use the example below for Nginx, or consult your web server's documentation.
3. Test it with the [Android client](./clients/android).

## Scope

The objective of the PoC is to assess the feasibility of the protocol,
by focusing on the areas in which I personally lack experience (e.g. NATs, IPv6, TUN interfaces).
Those components in which I have extensive experience,
such as authentication and encryption,
are not implemented in the PoC.

## Architecture

The main architectural difference between Fān Qiáng and other VPN protocols is that the _VPN server_ is split into two components:
The **tunnel**,
responsible for obfuscating the traffic,
and the **gateway**,
responsible for routing the traffic to and from the Internet.

We split the server mainly to circumvent censorship,
but this architecture is comparable to what VPN providers refer to as _multi-hop_ or _double VPN_,
which is typically employed to improve privacy.

The client and the gateway communicate over WebSockets via the tunnel,
which is a mere Application Layer reverse proxy.
The following diagram illustrates the relay of packets between a client (`192.168.0.1`) and an Internet host (`1.1.1.1`),
via a tunnel (`https://tunnel.example`) and a gateway (`192.0.2.1`, `https://gateway.example`):

```mermaid
sequenceDiagram
    participant Client
    participant Tunnel
    participant Gateway
    participant Server as 1.1.1.1
    
    note over Client: Encrypt PACKET_1 with Gateway's key
    Client->>Tunnel: PACKET_1 (src: 192.168.0.1, dst: 1.1.1.1)
    Tunnel->>Gateway: PACKET_1 (src: 192.168.0.1, dst: 1.1.1.1)
    note over Gateway: Decrypt PACKET_1 and change source
    Gateway->>Server: PACKET_1 (src: 192.0.2.1, dst: 1.1.1.1)
    Server->>Gateway: PACKET_2 (src: 1.1.1.1, dst: 192.0.2.1)
    note over Gateway: Change PACKET_2 destination and encrypt it with Client's key
    Gateway->>Tunnel: PACKET_2 (src: 1.1.1.1, dst: 192.168.0.1)
    Tunnel->>Client: PACKET_2 (src: 1.1.1.1, dst: 192.168.0.1)
    note over Client: Decrypt PACKET_2
```

Per the diagram above,
the communication between the client and the gateway will be E2E encrypted
(it isn't in this PoC).
Additionally,
the communication between the client and the tunnel, and between the tunnel and the gateway, is done over TLS.

## How this is different from other HTTPS-based tunnels

The idea of using HTTPS websites as fronts for proxy or VPN traffic is not new.
[Tor's _WebTunnel_ bridge](https://blog.torproject.org/introducing-webtunnel-evading-censorship-by-hiding-in-plain-sight/)
and
[other GitHub projects](https://github.com/search?q=%28VPN+OR+tunnel%29+AND+WebSockets&type=repositories&s=&o=desc)
typically use WebSockets,
but the emerging
[WebTransport API](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport_API)
and
[MASQUE](https://blog.cloudflare.com/unlocking-quic-proxying-potential/)
are also promising candidates.
In recent years,
the technique has been studied academically under the name
[HTTPT](https://www.usenix.org/conference/foci20/presentation/frolov).

**What sets Fān Qiáng apart is its resilience to enumeration**,
by offering a trivial and universal way to turn any HTTPS website into a tunnel.
Here,
tunnels are simply reverse proxies,
so this low barrier should allow us to offer a ratio of tunnels to users that's orders of magnitude higher than existing solutions.

For example,
an existing Nginx `server {...}` block for `example.com` could host a Fān Qiáng tunnel under `https://example.com/<random-path>` with the following configuration:

```nginx
location /<random-path> {
    # To minimise latency, use a gateway close to the tunnel.
    proxy_pass https://london.gb.gateways.relaycorp.tech/tunnel;
    
    # Enable WebSockets
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    access_log off;
}
```

**This is all that's needed to set up a tunnel**.
By contrast,
existing solutions also require the tunnel operator to set up and operate a purpose-built WebSocket server;
worse yet,
some even require elevated privileges to use sensitive networking capabilities.

We're starting with WebSockets because it's universally supported and easy to set up,
but an eventual production implementation might also add MASQUE support once mainstream web servers add HTTP/3 support to their reverse proxies.

## Fingerprinting mitigation

We obfuscate the connection to prevent censors from identifying it as a VPN tunnel,
and eavesdroppers from analysing traffic patterns.
We achieve this by:

- Having the client and the gateway exchange _noise_ frames of random sizes and at random intervals throughout the lifespan of the connection.
  However, the production implementation will produce consistent patterns for any given tunnel -- that is, censors won't observe widely different patterns across connections to the same website.
- Padding each packet to a random size. The eventual production implementation might batch packets (instead of padding or in addition to it).

The production implementation will also mimic a web browser by:

- Simulating the retrieval of a web page prior to opening a WebSocket connection.
  The client would open an initial TLS connection with an ALPN of `h2`/`h3`, get a response, and then make subsequent requests to emulate the retrieval of assets like images and JS files. This pattern should be stable by tunnel, but generally random across tunnels.
- Mimicking the behaviour of a mainstream browser during a TLS handshake to ensure that its [JA4 TLS fingerprint](https://blog.foxio.io/ja4%2B-network-fingerprinting) will match that of the browser. We'll have to use a library like [rquest](https://github.com/0x676e67/rquest).

## VPN protocol

In this PoC,
the connection starts with the gateway sending a WebSockets frame with the IPv4 and IPv6 subnets allocated to the client (e.g. `10.0.102.0/30,fd00:1234::2:0/127`).
To prevent fingerprinting,
in addition to being padded to a random size like any other frame,
it will often be delayed too;
during this delay, the client and gateway may send noise frame(s).

From then on,
the client and the gateway exchange IP packets over the WebSockets connection.

In principle,
we're only interested in the tunnelling aspect.
The underlying VPN protocol,
whether it's OpenVPN® or WireGuard®,
should be irrelevant.
In practice,
however,
the **current** implementations of OpenVPN® and WireGuard® would prove exceptionally problematic in production.

Neither OpenVPN® nor WireGuard® servers natively support client-side interfaces based on WebSockets,
so we would've to implement and/or integrate **another middleware** (e.g. [wstunnel](https://github.com/erebe/wstunnel)) to bridge the two.
This would've added significant complexity and costs in production,
and reduced performance.

If we were to do any kind of advanced integration with the VPN protocol,
we would've only considered WireGuard®,
given its simplicity,
but much to our regret,
it wasn't a viable option.
We would've faced the same [challenges that led Cloudflare to create their own implementation from scratch](https://blog.cloudflare.com/boringtun-userspace-wireguard-rust/).
Unfortunately,
[Cloudflare appears to have abandoned their implementation](https://github.com/cloudflare/boringtun/issues/407),
and whilst [a fork has emerged recently](https://github.com/cloudflare/boringtun/issues/407#issuecomment-2198051893),
it's too soon to tell if it will be reliable enough for production.

In other words,
we would've used the WireGuard® protocol had it not been for its current implementations,
which would make it too risky and costly to deploy to production in our case.
If this project takes off,
we'll probably contribute to WireGuard®,
so we can replace our VPN protocol and focus on the tunnelling.

## Alternative tunnelling methods

Future versions of the protocol may support additional tunnelling methods.
By baking tunnelling into the protocol,
the gateway can automatically support any type of tunnelling method that the client uses,
whilst preserving the E2E encryption between the client and the gateway.
Alternative methods could include:

- Video calls, preferably using an E2E encrypted platform like Zoom.
  The client would use a _virtual webcam_ (see [pyvirtualcam](https://pypi.org/project/pyvirtualcam/)) to send packets, and a video decoder for the incoming packets.
  The tunnel would decode the video stream from the client and send the packets to the gateway,
  and encode the packets from the gateway and send them to the client.
- Email (SMTP and IMAP).
  Once configured with the credentials,
  the client and the tunnel would exchange packets via email with no user intervention.
  Packets would be batched for efficiency.

Naturally,
the methods above would be used sparingly to avoid detection and because of their extremely low throughput.
It should also be considered whether the method would breach the terms of the underlying service.
