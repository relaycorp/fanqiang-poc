package tech.relaycorp.fanqiang.poc.ip.subnet

import java.net.InetAddress

abstract class Subnet<Address: InetAddress>(val host: Address, val mask: UByte) {
    abstract fun getFirstAssignableAddress(): Address

    override fun toString(): String {
        return "${host.hostAddress}/$mask"
    }
}
