package tech.relaycorp.fanqiang.poc.tunnel

import kotlinx.coroutines.delay
import tech.relaycorp.fanqiang.poc.VpnInterface
import java.nio.ByteBuffer
import kotlin.random.Random

object Obfuscation {
    /**
     * Minimum delay between noise messages in milliseconds.
     *
     * Should be a fraction of the server's minimum delay, so that sometimes the client will
     * be the first to send a message.
     */
    private const val MIN_DELAY_MS = 50L
    private const val MAX_DELAY_MS = 500L

    private const val MAX_NOISE_SIZE = VpnInterface.MTU

    private val NOISE_BUFFER = ByteArray(MAX_NOISE_SIZE)

    private val MESSAGE_LENGTH_MASK = 0b10000000_00000000.toUShort()

    private fun getRandomDelayMs(): Long = Random.nextLong(MIN_DELAY_MS, MAX_DELAY_MS + 1)

    private suspend fun delay() {
        delay(getRandomDelayMs())
    }

    private fun generateNoiseSize() = Random.nextInt(1, MAX_NOISE_SIZE + 1)

    private fun generateNoise(): ByteBuffer {
        val noiseSize = generateNoiseSize()
        return ByteBuffer.wrap(NOISE_BUFFER, 0, noiseSize)
    }

    suspend fun delayAndGenerateNoise(): ByteBuffer {
        delay()

        return generateNoise()
    }

    fun isNoiseMessage(message: ByteArray): Boolean {
        return message.isEmpty() || message[0] == 0.toByte()
    }

    fun padMessage(message: ByteBuffer): ByteBuffer {
        val paddingSize = generateNoiseSize()
        val messageSize = message.remaining()
        val paddedMessage = ByteBuffer.allocate(2 + messageSize + paddingSize)

        val messageLengthMasked = messageSize.toUShort() or MESSAGE_LENGTH_MASK
        paddedMessage.putShort(messageLengthMasked.toShort())

        paddedMessage.put(message)
        paddedMessage.position(paddedMessage.capacity())
        paddedMessage.flip()
        return paddedMessage
    }

    fun unpadMessage(paddedMessage: ByteArray): ByteArray {
        val messageLengthMasked = ByteBuffer.wrap(paddedMessage, 0, 2).short.toUShort()
        val messageSize = messageLengthMasked and MESSAGE_LENGTH_MASK.inv()
        // The production code shouldn't duplicate the message
        return paddedMessage.sliceArray(2 until 2 + messageSize.toInt())
    }
}
