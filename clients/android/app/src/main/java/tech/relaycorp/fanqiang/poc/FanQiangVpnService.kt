package tech.relaycorp.fanqiang.poc

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.VpnService
import android.util.Log
import androidx.core.app.NotificationCompat
import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.websocket.DefaultClientWebSocketSession
import io.ktor.client.plugins.websocket.WebSockets
import io.ktor.client.plugins.websocket.wss
import io.ktor.websocket.Frame
import io.ktor.websocket.readText
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import tech.relaycorp.fanqiang.poc.ip.subnet.Ipv4Subnet
import tech.relaycorp.fanqiang.poc.ip.subnet.Ipv6Subnet
import tech.relaycorp.fanqiang.poc.tunnel.Obfuscation

class FanQiangVpnService : VpnService() {

    private var vpnInterface: VpnInterface? = null
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

            launch { sendNoise() }

            val (ipv4Subnet, ipv6Subnet) = receiveSubnets()
            setupVpnInterface(ipv4Subnet, ipv6Subnet)

            showNotification("VPN Connected")
            notifyActivity(true)

            launch { forwardOutgoingPackets() }
            forwardIncomingPackets()
        }
    }

    private suspend fun DefaultClientWebSocketSession.receiveSubnets(): Pair<Ipv4Subnet, Ipv6Subnet> {
        val frame = incoming.receive()
        if (frame !is Frame.Text) {
            Log.d(TAG, "Ignoring noise frame before receiving subnets")
            return receiveSubnets()
        }
        return frame.readText().split(",").let {
            val ipv4Subnet = Ipv4Subnet.fromString(it[0])
            val ipv6Subnet = Ipv6Subnet.fromString(it[1])
            Pair(ipv4Subnet, ipv6Subnet)
        }
    }

    private fun setupVpnInterface(ipv4Subnet: Ipv4Subnet, ipv6Subnet: Ipv6Subnet) {
        Log.d(TAG, "Setting up VPN interface with subnets $ipv4Subnet and $ipv6Subnet")

        val builder = Builder()
            .addDisallowedApplication(packageName)  // Exclude this app from the VPN
            .setSession("FanQiangVPN")
        try {
            vpnInterface = VpnInterface.init(
                builder,
                ipv4Subnet,
                ipv6Subnet,
            )
        } catch (e: IllegalArgumentException) {
            Log.e(TAG, "Error setting up VPN interface", e)
            throw e
        }
        Log.d(TAG, "VPN interface established successfully")
    }

    private suspend fun DefaultClientWebSocketSession.sendNoise() {
        while (isActive) {
            val noise = Obfuscation.delayAndGenerateNoise()
            Log.d(TAG, "Sending noise...")
            send(Frame.Binary(true, noise))
        }
    }

    private suspend fun DefaultClientWebSocketSession.forwardOutgoingPackets() {
        Log.d(TAG, "Starting to forward outgoing packets")
        for (packet in vpnInterface!!.readPackets()) {
            if (!isActive) {
                break
            }
            val packetPadded = Obfuscation.padPacket(packet)
            send(Frame.Binary(true, packetPadded))
        }
    }

    private suspend fun DefaultClientWebSocketSession.forwardIncomingPackets() {
        Log.d(TAG, "Starting to forward incoming packets")
        for (frame in incoming) {
            if (frame is Frame.Binary) {
                vpnInterface?.writePacket(frame.data)
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
