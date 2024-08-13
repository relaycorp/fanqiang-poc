package tech.relaycorp.fanqiang.poc.ip.subnet

import java.net.Inet6Address

class Ipv6Subnet(host: Inet6Address, mask: UByte) : Subnet<Inet6Address>(host, mask) {
    override fun getFirstAssignableAddress(): Inet6Address {
        // This isn't actually using the CIDR. The production code will have to.
        val address = host.address.copyOf().apply {
            // Skip the first address (:0) as that appears to be used for NDP.
            this[this.size - 1] = 1.toByte()
        }
        return Inet6Address.getByAddress(address) as Inet6Address
    }

    companion object {
        const val MAX_MASK = 128

        fun fromString(subnet: String): Ipv6Subnet {
            val parts = subnet.split("/")
            require(parts.size == 2) { "Invalid subnet: $subnet" }
            val host = Inet6Address.getByName(parts[0]) as Inet6Address
            val mask = parts[1].toUByte()
            require(mask <= MAX_MASK.toUByte()) { "Invalid mask: $mask" }
            return Ipv6Subnet(host, mask)
        }
    }
}
