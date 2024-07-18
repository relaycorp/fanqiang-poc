import { Ipv4Address } from '../../protocolDataUnits/ipv4/Ipv4Address.js';
import { Ipv6Address } from '../../protocolDataUnits/ipv6/Ipv6Address.js';
import { IpAddress } from '../../protocolDataUnits/IpAddress.js';

export interface BaseIpChecksumContext<AddressType extends IpAddress<any>> {
  readonly sourceAddress: AddressType;
  readonly destinationAddress: AddressType;
}

type Ipv4ChecksumContext = BaseIpChecksumContext<Ipv4Address>;

type Ipv6ChecksumContext = BaseIpChecksumContext<Ipv6Address>;

export type IpChecksumContext = Ipv4ChecksumContext | Ipv6ChecksumContext;
