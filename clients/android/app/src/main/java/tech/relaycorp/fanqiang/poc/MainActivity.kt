package tech.relaycorp.fanqiang.poc

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.VpnService
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import tech.relaycorp.fanqiang.poc.ui.theme.FanQiangTheme

class MainActivity : ComponentActivity() {
    private var isVpnRunning by mutableStateOf(false)
    private var serverUrl by mutableStateOf("wss://gateway5.chores.fans")

    private val vpnStatusReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action == "VPN_STATUS_UPDATE") {
                isVpnRunning = intent.getBooleanExtra("IS_RUNNING", false)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            FanQiangTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    FanQiangContent()
                }
            }
        }
    }

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    fun FanQiangContent() {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            OutlinedTextField(
                value = serverUrl,
                onValueChange = { serverUrl = it },
                label = { Text("Server URL") },
                modifier = Modifier.fillMaxWidth(),
                enabled = !isVpnRunning,
            )

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = {
                    if (isVpnRunning) {
                        stopVpn()
                    } else {
                        requestVpnPermission()
                    }
                }
            ) {
                Text(if (isVpnRunning) "Stop VPN" else "Start VPN")
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text("VPN Status: ${if (isVpnRunning) "Running" else "Stopped"}")
        }
    }

    private fun requestVpnPermission() {
        val vpnIntent = VpnService.prepare(this)
        Log.d(TAG, "Preparing: $vpnIntent")
        if (vpnIntent != null) {
            startActivityForResult(vpnIntent, VPN_PERMISSION_REQUEST)
        } else {
            onActivityResult(VPN_PERMISSION_REQUEST, RESULT_OK, null)
        }
    }

    private fun startVpn() {
        val intent = Intent(this, FanQiangVpnService::class.java).apply {
            action = "START"
            putExtra("SERVER_URL", serverUrl)
        }
        startService(intent)
        isVpnRunning = true
        Toast.makeText(this, "VPN Service started", Toast.LENGTH_SHORT).show()
    }

    private fun stopVpn() {
        val intent = Intent(this, FanQiangVpnService::class.java).apply {
            action = "STOP"
        }
        startService(intent)
        isVpnRunning = false
        Toast.makeText(this, "VPN Service stopped", Toast.LENGTH_SHORT).show()
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == VPN_PERMISSION_REQUEST && resultCode == RESULT_OK) {
            startVpn()
        } else {
            Toast.makeText(this, "VPN permission denied", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onResume() {
        super.onResume()
        registerReceiver(vpnStatusReceiver, IntentFilter("VPN_STATUS_UPDATE"))
    }

    override fun onPause() {
        super.onPause()
        unregisterReceiver(vpnStatusReceiver)
    }

    companion object {
        private const val VPN_PERMISSION_REQUEST = 1
        private const val TAG = "MainActivity"
    }
}