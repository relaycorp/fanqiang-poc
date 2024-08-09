import { IpPacket } from '../IpPacket.js';
import { Ipv6Address } from './Ipv6Address.js';
import { IpProtocol } from '../IpProtocol.js';

enum HeaderFieldIndex {
  VERSION_TRAFFIC_CLASS_FLOW_LABEL = 0,
  PAYLOAD_LENGTH = 4,
  NEXT_HEADER = 6,
  HOP_LIMIT = 7,
  SOURCE_ADDRESS = 8,
  DESTINATION_ADDRESS = 24,
}

const EXTENSION_HEADER_VALUES = new Set([
  IpProtocol.HOPOPT,
  IpProtocol.ROUTING,
  IpProtocol.FRAGMENT,
  IpProtocol.ESP,
  IpProtocol.AH,
  IpProtocol.IPV6_NONXT,
  IpProtocol.IPV6_OPTS,
  IpProtocol.MOBILITY,
  IpProtocol.HIP,
  IpProtocol.SHIM6,
  IpProtocol.RESERVED,
  IpProtocol.RESERVED2,
]);

export class Ipv6Packet extends IpPacket<Ipv6Address> {
  public static create(
    sourceAddress: Ipv6Address,
    destinationAddress: Ipv6Address,
    protocol: number,
    payload: Buffer,
  ): Ipv6Packet {
    const MIN_IPV6_PACKET_LENGTH = 40;
    const buffer = Buffer.alloc(MIN_IPV6_PACKET_LENGTH + payload.length);

    // Set Version to 6, Traffic Class and Flow Label to 0
    buffer.writeUInt32BE(
      0x60000000,
      HeaderFieldIndex.VERSION_TRAFFIC_CLASS_FLOW_LABEL,
    );

    buffer.writeUInt16BE(payload.length, HeaderFieldIndex.PAYLOAD_LENGTH);

    buffer[HeaderFieldIndex.NEXT_HEADER] = protocol;

    buffer[HeaderFieldIndex.HOP_LIMIT] = 64;

    payload.copy(buffer, MIN_IPV6_PACKET_LENGTH);

    const packet = new Ipv6Packet(buffer);
    packet.setSourceAddress(sourceAddress);
    packet.setDestinationAddress(destinationAddress);

    return packet;
  }

  override getSourceAddress(): Ipv6Address {
    const addressBuffer = this.buffer.subarray(
      HeaderFieldIndex.SOURCE_ADDRESS,
      HeaderFieldIndex.SOURCE_ADDRESS + Ipv6Address.OCTETS_LENGTH,
    );
    return new Ipv6Address(addressBuffer);
  }

  override setSourceAddress(newIpAddress: Ipv6Address): void {
    newIpAddress.buffer.copy(this.buffer, HeaderFieldIndex.SOURCE_ADDRESS);
  }

  override getDestinationAddress(): Ipv6Address {
    const addressBuffer = this.buffer.subarray(
      HeaderFieldIndex.DESTINATION_ADDRESS,
      HeaderFieldIndex.DESTINATION_ADDRESS + Ipv6Address.OCTETS_LENGTH,
    );
    return new Ipv6Address(addressBuffer);
  }

  override setDestinationAddress(newIpAddress: Ipv6Address): void {
    newIpAddress.buffer.copy(this.buffer, HeaderFieldIndex.DESTINATION_ADDRESS);
  }

  override getTransportProtocol(): number | null {
    let offset =
      HeaderFieldIndex.DESTINATION_ADDRESS + Ipv6Address.OCTETS_LENGTH;
    let nextHeader = this.buffer[HeaderFieldIndex.NEXT_HEADER];

    while (EXTENSION_HEADER_VALUES.has(nextHeader)) {
      if (nextHeader === IpProtocol.IPV6_NONXT) {
        return null;
      }

      const nextHeaderLength = this.buffer[offset + 1];
      offset += nextHeaderLength * 8 + 8;
      nextHeader = this.buffer[offset];
    }

    return nextHeader;
  }
}
