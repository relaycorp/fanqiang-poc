package tech.relaycorp.fanqiang.poc.ip.subnet

import java.net.Inet4Address

class Ipv4Subnet(host: Inet4Address, mask: UByte) : Subnet<Inet4Address>(host, mask) {
    override fun getFirstAssignableAddress(): Inet4Address {
        // This isn't actually using the CIDR. The production code will have to.
        val address = host.address.copyOf().apply {
            // Skip the network (0) and gateway (1) addresses
            this[this.size - 1] = 2.toByte()
        }
        return Inet4Address.getByAddress(address) as Inet4Address
    }

    companion object {
        const val MAX_MASK = 32

        fun fromString(subnet: String): Ipv4Subnet {
            val parts = subnet.split("/")
            require(parts.size == 2) { "Invalid subnet: $subnet" }
            val host = Inet4Address.getByName(parts[0]) as Inet4Address
            val mask = parts[1].toUByte()
            require(mask <= MAX_MASK.toUByte()) { "Invalid mask: $mask" }
            return Ipv4Subnet(host, mask)
        }
    }
}
