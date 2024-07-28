package tech.relaycorp.fanqiang.poc

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import android.util.Log
import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.websocket.*
import io.ktor.websocket.*
import kotlinx.coroutines.*
import java.io.FileInputStream
import java.io.FileOutputStream
import java.nio.ByteBuffer

class FanQiangVpnService : VpnService() {

    private var vpnInterface: ParcelFileDescriptor? = null
    private var connectionJob: Job? = null
    private val httpClient = HttpClient(CIO) {
        install(WebSockets)
    }

    companion object {
        private const val NOTIFICATION_CHANNEL_ID = "FanQiangVpnChannel"
        private const val NOTIFICATION_ID = 1
        private const val TAG = "FanQiangVpnService"
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            "START" -> start(intent.getStringExtra("SERVER_URL") ?: "wss://gateway2.chores.fans")
            "STOP" -> stop()
        }
        return START_STICKY
    }

    private fun start(serverUrl: String) {
        val pendingIntent: PendingIntent =
            Intent(this, MainActivity::class.java).let { notificationIntent ->
                PendingIntent.getActivity(this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE)
            }

        val notification: Notification = Notification.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("Fan Qiang VPN")
            .setContentText("VPN is running")
            .setSmallIcon(R.drawable.baseline_vpn_lock_24)
            .setContentIntent(pendingIntent)
            .build()

        startForeground(NOTIFICATION_ID, notification)

        connectionJob = CoroutineScope(Dispatchers.IO).launch {
            connectToServer(serverUrl)
        }
    }

    private fun stop() {
        connectionJob?.cancel()
        stopForeground(true)
        stopSelf()
    }

    private suspend fun connectToServer(serverUrl: String) {
        try {
            httpClient.wss(urlString = serverUrl) {
                val subnet = receiveSubnet()
                setupVpnInterface(subnet)

                launch { forwardOutgoingPackets() }
                forwardIncomingPackets()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in VPN connection", e)
        } finally {
            closeVpnInterface()
        }
    }

    private suspend fun DefaultClientWebSocketSession.receiveSubnet(): String {
        val frame = incoming.receive() as? Frame.Text ?: throw IllegalStateException("Expected text frame")
        return frame.readText()
    }

    private fun setupVpnInterface(subnet: String) {
        val address = subnet.substringBefore('/')
        val prefixLength = subnet.substringAfter('/').toInt()

        vpnInterface = Builder()
            .addAddress(address, prefixLength)
            .addRoute("0.0.0.0", 0)
            .establish()
    }

    private suspend fun DefaultClientWebSocketSession.forwardOutgoingPackets() {
        val inputStream = FileInputStream(vpnInterface?.fileDescriptor)
        val buffer = ByteArray(Short.MAX_VALUE.toInt())

        while (isActive) {
            val length = inputStream.read(buffer)
            if (length > 0) {
                send(Frame.Binary(true, ByteBuffer.wrap(buffer, 0, length)))
            }
        }
    }

    private suspend fun DefaultClientWebSocketSession.forwardIncomingPackets() {
        val outputStream = FileOutputStream(vpnInterface?.fileDescriptor)

        for (frame in incoming) {
            if (frame is Frame.Binary) {
                outputStream.write(frame.data)
                outputStream.flush()
            }
        }
    }

    private fun closeVpnInterface() {
        vpnInterface?.close()
        vpnInterface = null
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            NOTIFICATION_CHANNEL_ID,
            "Fan Qiang VPN Service",
            NotificationManager.IMPORTANCE_DEFAULT
        )
        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.createNotificationChannel(channel)
    }
}