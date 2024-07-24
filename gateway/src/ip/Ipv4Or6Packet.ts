import { Ipv6Packet } from './ipv6/Ipv6Packet.js';
import { Ipv4Packet } from './ipv4/Ipv4Packet.js';

export type Ipv4Or6Packet = Ipv4Packet | Ipv6Packet;
