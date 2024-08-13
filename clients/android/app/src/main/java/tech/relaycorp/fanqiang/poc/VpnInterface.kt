package tech.relaycorp.fanqiang.poc

import android.net.VpnService.Builder
import android.os.ParcelFileDescriptor
import tech.relaycorp.fanqiang.poc.ip.subnet.Ipv4Subnet
import tech.relaycorp.fanqiang.poc.ip.subnet.Ipv6Subnet
import java.io.FileInputStream
import java.io.FileOutputStream
import java.nio.ByteBuffer

class VpnInterfaceException(message: String) : Exception(message)

class VpnInterface(private val fileDescriptor: ParcelFileDescriptor) {
    private val inputStream = FileInputStream(fileDescriptor.fileDescriptor)
    private val outputStream = FileOutputStream(fileDescriptor.fileDescriptor)

    fun readPackets(): Sequence<ByteBuffer> = sequence {
        val packet = ByteArray(MTU)
        while (true) {
            val bytesRead = inputStream.read(packet)
            if (0 < bytesRead) {
                yield(ByteBuffer.wrap(packet, 0, bytesRead))
            }
        }
    }

    fun writePacket(packet: ByteArray) {
        outputStream.write(packet)
        outputStream.flush()
    }

    fun close() {
        inputStream.close()
        outputStream.close()
        fileDescriptor.close()
    }

    companion object {
        // TODO: Make variable
        private const val MTU = 1500

        @Throws(IllegalArgumentException::class)
        fun init(
            vpnServiceBuilder: Builder,
            ipv4Subnet: Ipv4Subnet,
            ipv6Subnet: Ipv6Subnet
        ): VpnInterface {
            val vpnInterface = vpnServiceBuilder
                // IPv4
                .addAddress(ipv4Subnet.getFirstAssignableAddress(), Ipv4Subnet.MAX_MASK)
                .addRoute("0.0.0.0", 0)

                // IPv6
                .addAddress(ipv6Subnet.getFirstAssignableAddress(), Ipv6Subnet.MAX_MASK)
                .addRoute("::", 0)

                .establish() ?: throw VpnInterfaceException("Failed to establish VPN interface")

            return VpnInterface(vpnInterface)
        }
    }
}
