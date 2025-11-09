package com.sosapp.android.data.models

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.google.gson.annotations.SerializedName
import java.util.Date

// User
data class User(
    val id: String,
    val firstName: String,
    val lastName: String,
    val email: String,
    val phoneNumber: String,
    val createdAt: Date,
    val updatedAt: Date
)

// Auth
data class AuthTokens(
    val accessToken: String,
    val refreshToken: String
)

data class AuthResponse(
    val user: User,
    val tokens: AuthTokens
)

data class LoginRequest(
    val email: String,
    val password: String
)

data class RegisterRequest(
    val firstName: String,
    val lastName: String,
    val email: String,
    val phoneNumber: String,
    val password: String
)

// Emergency
enum class EmergencyType {
    @SerializedName("MEDICAL")
    MEDICAL,

    @SerializedName("ACCIDENT")
    ACCIDENT,

    @SerializedName("CRIME")
    CRIME,

    @SerializedName("FIRE")
    FIRE,

    @SerializedName("NATURAL_DISASTER")
    NATURAL_DISASTER,

    @SerializedName("OTHER")
    OTHER
}

enum class EmergencyStatus {
    @SerializedName("ACTIVE")
    ACTIVE,

    @SerializedName("RESOLVED")
    RESOLVED,

    @SerializedName("CANCELLED")
    CANCELLED
}

data class Emergency(
    val id: String,
    val userId: String,
    val type: EmergencyType,
    val status: EmergencyStatus,
    val location: Location?,
    val notes: String?,
    val createdAt: Date,
    val updatedAt: Date,
    val resolvedAt: Date?
)

data class Location(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Double,
    val timestamp: Date
)

data class TriggerEmergencyRequest(
    val type: EmergencyType,
    val location: Location?,
    val notes: String?
)

// Emergency Contact
enum class ContactRelationship {
    @SerializedName("SPOUSE")
    SPOUSE,

    @SerializedName("PARENT")
    PARENT,

    @SerializedName("CHILD")
    CHILD,

    @SerializedName("SIBLING")
    SIBLING,

    @SerializedName("FRIEND")
    FRIEND,

    @SerializedName("COLLEAGUE")
    COLLEAGUE,

    @SerializedName("NEIGHBOR")
    NEIGHBOR,

    @SerializedName("OTHER")
    OTHER
}

enum class ContactPriority {
    @SerializedName("PRIMARY")
    PRIMARY,

    @SerializedName("SECONDARY")
    SECONDARY,

    @SerializedName("TERTIARY")
    TERTIARY
}

data class EmergencyContact(
    val id: String,
    val userId: String,
    val name: String,
    val phoneNumber: String,
    val relationship: ContactRelationship,
    val priority: ContactPriority,
    val createdAt: Date,
    val updatedAt: Date
)

data class CreateContactRequest(
    val name: String,
    val phoneNumber: String,
    val relationship: ContactRelationship,
    val priority: ContactPriority
)

// Medical Profile
data class MedicalProfile(
    val id: String,
    val userId: String,
    val bloodType: String?,
    val allergies: List<String>,
    val medications: List<Medication>,
    val conditions: List<String>,
    val notes: String?,
    val createdAt: Date,
    val updatedAt: Date
)

data class Medication(
    val name: String,
    val dosage: String,
    val frequency: String
)

// Message
data class Message(
    val id: String,
    val emergencyId: String,
    val senderId: String,
    val senderName: String?,
    val text: String,
    val createdAt: Date,
    val deliveredAt: Date?,
    val readAt: Date?
)

// Room Database Entities

@Entity(tableName = "queued_emergencies")
data class QueuedEmergency(
    @PrimaryKey val id: String,
    val type: String,
    val latitude: Double,
    val longitude: Double,
    val accuracy: Double,
    val notes: String?,
    val timestamp: Long,
    val retryCount: Int
)

@Entity(tableName = "queued_locations")
data class QueuedLocation(
    @PrimaryKey val id: String,
    val emergencyId: String,
    val latitude: Double,
    val longitude: Double,
    val accuracy: Double,
    val timestamp: Long,
    val retryCount: Int
)

@Entity(tableName = "queued_messages")
data class QueuedMessage(
    @PrimaryKey val id: String,
    val emergencyId: String,
    val text: String,
    val timestamp: Long,
    val retryCount: Int
)

// WebSocket Events
data class LocationUpdateEvent(
    val emergencyId: String,
    val location: Location
)

data class ChatMessageEvent(
    val emergencyId: String,
    val message: Message
)

data class TypingEvent(
    val roomId: String,
    val userId: String,
    val userName: String
)
