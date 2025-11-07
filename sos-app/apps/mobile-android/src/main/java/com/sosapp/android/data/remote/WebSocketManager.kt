package com.sosapp.android.data.remote

import com.sosapp.android.data.models.Location
import com.sosapp.android.data.models.Message
import io.socket.client.IO
import io.socket.client.Socket
import io.socket.emitter.Emitter
import org.json.JSONObject
import java.net.URISyntaxException

class WebSocketManager {
    private var socket: Socket? = null
    private var emergencyId: String? = null

    var onLocationUpdate: ((Location) -> Unit)? = null
    var onChatMessage: ((Message) -> Unit)? = null
    var onConnectionChange: ((Boolean) -> Unit)? = null
    var onTypingStart: ((String) -> Unit)? = null
    var onTypingStop: ((String) -> Unit)? = null

    fun connect(emergencyId: String) {
        this.emergencyId = emergencyId

        try {
            val token = TokenManager.getAccessToken() ?: return

            val options = IO.Options().apply {
                query = "token=$token"
                transports = arrayOf("websocket", "polling")
            }

            socket = IO.socket("http://10.0.2.2:3000", options)

            socket?.apply {
                on(Socket.EVENT_CONNECT, onConnect)
                on(Socket.EVENT_DISCONNECT, onDisconnect)
                on(Socket.EVENT_CONNECT_ERROR, onConnectError)
                on("location-update", onLocationUpdateEvent)
                on("chat-message", onChatMessageEvent)
                on("typing-start", onTypingStartEvent)
                on("typing-stop", onTypingStopEvent)

                connect()
            }
        } catch (e: URISyntaxException) {
            e.printStackTrace()
        }
    }

    fun disconnect() {
        socket?.apply {
            off()
            disconnect()
        }
        socket = null
    }

    fun sendLocationUpdate(location: Location) {
        val json = JSONObject().apply {
            put("emergencyId", emergencyId)
            put("location", JSONObject().apply {
                put("latitude", location.latitude)
                put("longitude", location.longitude)
                put("accuracy", location.accuracy)
                put("timestamp", location.timestamp.time)
            })
        }

        socket?.emit("location-update", json)
    }

    fun sendChatMessage(text: String) {
        val json = JSONObject().apply {
            put("emergencyId", emergencyId)
            put("text", text)
            put("timestamp", System.currentTimeMillis())
        }

        socket?.emit("chat-message", json)
    }

    fun sendTypingIndicator(isTyping: Boolean) {
        val event = if (isTyping) "typing-start" else "typing-stop"
        val json = JSONObject().apply {
            put("roomId", emergencyId)
        }

        socket?.emit(event, json)
    }

    private val onConnect = Emitter.Listener {
        println("WebSocket connected")
        onConnectionChange?.invoke(true)

        // Join emergency room
        emergencyId?.let { id ->
            val json = JSONObject().apply {
                put("roomId", id)
            }
            socket?.emit("join-room", json)
        }
    }

    private val onDisconnect = Emitter.Listener {
        println("WebSocket disconnected")
        onConnectionChange?.invoke(false)
    }

    private val onConnectError = Emitter.Listener { args ->
        println("WebSocket connection error: ${args.firstOrNull()}")
        onConnectionChange?.invoke(false)
    }

    private val onLocationUpdateEvent = Emitter.Listener { args ->
        val data = args.firstOrNull() as? JSONObject ?: return@Listener

        try {
            val locationJson = data.getJSONObject("location")
            val location = Location(
                latitude = locationJson.getDouble("latitude"),
                longitude = locationJson.getDouble("longitude"),
                accuracy = locationJson.getDouble("accuracy"),
                timestamp = java.util.Date(locationJson.getLong("timestamp"))
            )

            onLocationUpdate?.invoke(location)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private val onChatMessageEvent = Emitter.Listener { args ->
        val data = args.firstOrNull() as? JSONObject ?: return@Listener

        try {
            val message = Message(
                id = data.getString("id"),
                emergencyId = data.getString("emergencyId"),
                senderId = data.getString("senderId"),
                senderName = data.optString("senderName"),
                text = data.getString("text"),
                createdAt = java.util.Date(data.getLong("createdAt")),
                deliveredAt = if (data.has("deliveredAt")) java.util.Date(data.getLong("deliveredAt")) else null,
                readAt = if (data.has("readAt")) java.util.Date(data.getLong("readAt")) else null
            )

            onChatMessage?.invoke(message)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private val onTypingStartEvent = Emitter.Listener { args ->
        val data = args.firstOrNull() as? JSONObject ?: return@Listener
        val userName = data.optString("userName", "Someone")
        onTypingStart?.invoke(userName)
    }

    private val onTypingStopEvent = Emitter.Listener { args ->
        val data = args.firstOrNull() as? JSONObject ?: return@Listener
        val userName = data.optString("userName", "Someone")
        onTypingStop?.invoke(userName)
    }
}
