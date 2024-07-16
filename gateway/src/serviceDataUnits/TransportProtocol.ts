/**
 * Supported transport protocols.
 *
 * That is, those protocols whose data units contain source and destination ports,
 * which can be used for packet forwarding.
 */
export enum TransportProtocol {
  TCP = 6,
  UDP = 17,
}
