package com.sosapp.android

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

class SOSApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager =
                getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Emergency Channel
            val emergencyChannel = NotificationChannel(
                CHANNEL_EMERGENCY,
                "Emergency Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Critical emergency notifications"
                enableVibration(true)
                setShowBadge(true)
            }

            // Location Tracking Channel
            val locationChannel = NotificationChannel(
                CHANNEL_LOCATION,
                "Location Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Background location tracking notifications"
            }

            // Chat Channel
            val chatChannel = NotificationChannel(
                CHANNEL_CHAT,
                "Emergency Chat",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Messages from emergency contacts"
            }

            notificationManager.createNotificationChannels(
                listOf(emergencyChannel, locationChannel, chatChannel)
            )
        }
    }

    companion object {
        const val CHANNEL_EMERGENCY = "emergency_channel"
        const val CHANNEL_LOCATION = "location_channel"
        const val CHANNEL_CHAT = "chat_channel"
    }
}
