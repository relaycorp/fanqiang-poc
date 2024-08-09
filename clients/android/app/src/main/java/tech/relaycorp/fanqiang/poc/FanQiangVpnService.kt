package tech.relaycorp.fanqiang.poc

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import android.util.Log
import androidx.core.app.NotificationCompat
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

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "onStartCommand: ${intent?.action}")
        when (intent?.action) {
            "START" -> {
                val serverUrl = intent.getStringExtra("SERVER_URL")
                if (serverUrl.isNullOrEmpty()) {
                    Log.e(TAG, "SERVER_URL is not set")
                    showNotification("Error: Server URL not set")
                    notifyActivity(false)
                    stopSelf()
                    return START_NOT_STICKY
                }
                start(serverUrl)
            }
            "STOP" -> stop()
            else -> {
                Log.e(TAG, "Unknown action: ${intent?.action}")
                stopSelf()
                return START_NOT_STICKY
            }
        }
        return START_STICKY
    }

    private fun start(serverUrl: String) {
        Log.d(TAG, "Starting VPN service with server URL: $serverUrl")
        showNotification("Connecting to VPN...")

        connectionJob = CoroutineScope(Dispatchers.IO).launch {
            try {
                connectToServer(serverUrl)
            } catch (e: Exception) {
                Log.e(TAG, "Error in VPN connection", e)
                showNotification("VPN connection failed")
                notifyActivity(false)
            }
        }
    }

    private fun stop() {
        Log.d(TAG, "Stopping VPN service")
        connectionJob?.cancel()
        closeVpnInterface()
        stopForeground(true)
        notifyActivity(false)
        stopSelf()
    }

    private suspend fun connectToServer(serverUrl: String) {
        Log.d(TAG, "Attempting to connect to server: $serverUrl")
        httpClient.wss(urlString = serverUrl) {
            Log.d(TAG, "WebSocket connection established")
            val (ipv4Subnet, ipv6Subnet) = receiveSubnet().split(",")
            setupVpnInterface(ipv4Subnet, ipv6Subnet)
            showNotification("VPN Connected")
            notifyActivity(true)

            launch { forwardOutgoingPackets() }
            forwardIncomingPackets()
        }
    }

    private suspend fun DefaultClientWebSocketSession.receiveSubnet(): String {
        val frame = incoming.receive() as Frame.Text
        return frame.readText()
    }

    private fun setupVpnInterface(ipv4Subnet: String, ipv6Subnet: String) {
        Log.d(TAG, "Setting up VPN interface with subnets $ipv4Subnet and $ipv6Subnet")

        val (ipv4Address, ipv4Mask) = ipv4Subnet.split('/').let {
            // Skip the network (0) and gateway (1) addresses.
            val address = it[0].substringBeforeLast('.') + ".2"
            val mask = 32
            Pair(address, mask)
        }
        val (ipv6Address, ipv6Mask) = ipv6Subnet.split('/').let {
            // Skip the first address (:0) as that appears to be used for NDP.
            val address = it[0].substringBeforeLast(':') + ":1"
            val mask = 128
            Pair(address, mask)
        }

        try {
            vpnInterface = Builder()
                // IPv4
                .addAddress(ipv4Address, ipv4Mask)
                .addRoute("0.0.0.0", 0)

                // IPv6
                .addAddress(ipv6Address, ipv6Mask)
                .addRoute("::", 0)

                .addDisallowedApplication(packageName)  // Exclude this app from the VPN
                .setSession("FanQiangVPN")
                .establish()
        } catch (e: Exception) {
            Log.e(TAG, "Error setting up VPN interface", e)
            throw e
        }
        Log.d(TAG, "VPN interface established successfully")
    }

    private suspend fun DefaultClientWebSocketSession.forwardOutgoingPackets() {
        Log.d(TAG, "Starting to forward outgoing packets")
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
        Log.d(TAG, "Starting to forward incoming packets")
        val outputStream = FileOutputStream(vpnInterface?.fileDescriptor)

        for (frame in incoming) {
            if (frame is Frame.Binary) {
                outputStream.write(frame.data)
                outputStream.flush()
            }
        }
    }

    private fun closeVpnInterface() {
        Log.d(TAG, "Closing VPN interface")
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

    private fun showNotification(status: String) {
        Log.d(TAG, "Showing notification with status: $status")
        val pendingIntent: PendingIntent =
            Intent(this, MainActivity::class.java).let { notificationIntent ->
                PendingIntent.getActivity(this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE)
            }

        val notification = NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("Fan Qiang VPN")
            .setContentText(status)
            .setSmallIcon(R.drawable.baseline_vpn_lock_24)
            .setContentIntent(pendingIntent)
            .build()

        startForeground(NOTIFICATION_ID, notification)
    }

    private fun notifyActivity(isRunning: Boolean) {
        val intent = Intent("VPN_STATUS_UPDATE").apply {
            putExtra("IS_RUNNING", isRunning)
        }
        sendBroadcast(intent)
    }

    companion object {
        private const val NOTIFICATION_CHANNEL_ID = "FanQiangVpnChannel"
        private const val NOTIFICATION_ID = 1
        private const val TAG = "FanQiangVpnService"
    }
}
