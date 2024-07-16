import { Ipv4Address } from '../../ip/ipv4/Ipv4Address.js';
import { Ipv6Address } from '../../ip/ipv6/Ipv6Address.js';
import { BaseIpAddress } from '../../ip/BaseIpAddress.js';

export interface BaseIpChecksumContext<AddressType extends BaseIpAddress<any>> {
  readonly sourceAddress: AddressType;
  readonly destinationAddress: AddressType;
}

type Ipv4ChecksumContext = BaseIpChecksumContext<Ipv4Address>;

type Ipv6ChecksumContext = BaseIpChecksumContext<Ipv6Address>;

export type IpChecksumContext = Ipv4ChecksumContext | Ipv6ChecksumContext;
