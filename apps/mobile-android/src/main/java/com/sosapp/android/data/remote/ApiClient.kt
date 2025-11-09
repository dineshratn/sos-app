package com.sosapp.android.data.remote

import com.sosapp.android.data.models.*
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import java.util.concurrent.TimeUnit

interface ApiService {
    // Auth
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): AuthResponse

    @POST("auth/refresh")
    suspend fun refreshToken(@Body refreshToken: String): AuthTokens

    @GET("auth/me")
    suspend fun getCurrentUser(): User

    // Emergency
    @POST("emergency/trigger")
    suspend fun triggerEmergency(@Body request: TriggerEmergencyRequest): Emergency

    @GET("emergency/{id}")
    suspend fun getEmergency(@Path("id") id: String): Emergency

    @POST("emergency/{id}/resolve")
    suspend fun resolveEmergency(@Path("id") id: String): Emergency

    @GET("emergency/history")
    suspend fun getEmergencyHistory(): List<Emergency>

    @POST("emergency/{id}/location")
    suspend fun updateLocation(@Path("id") id: String, @Body location: Location)

    // Contacts
    @GET("contacts")
    suspend fun getContacts(): List<EmergencyContact>

    @POST("contacts")
    suspend fun createContact(@Body request: CreateContactRequest): EmergencyContact

    @PUT("contacts/{id}")
    suspend fun updateContact(@Path("id") id: String, @Body request: CreateContactRequest): EmergencyContact

    @DELETE("contacts/{id}")
    suspend fun deleteContact(@Path("id") id: String)

    // Medical Profile
    @GET("medical-profile")
    suspend fun getMedicalProfile(): MedicalProfile

    @PUT("medical-profile")
    suspend fun updateMedicalProfile(@Body profile: MedicalProfile): MedicalProfile

    // Chat
    @GET("chat/{emergencyId}/messages")
    suspend fun getMessages(@Path("emergencyId") emergencyId: String): List<Message>

    @POST("chat/{emergencyId}/messages")
    suspend fun sendMessage(@Path("emergencyId") emergencyId: String, @Body text: String): Message
}

object ApiClient {
    private const val BASE_URL = "http://10.0.2.2:3000/api/v1/" // Android emulator localhost

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val authInterceptor = AuthInterceptor()

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .addInterceptor(authInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    val apiService: ApiService = retrofit.create(ApiService::class.java)
}

class AuthInterceptor : okhttp3.Interceptor {
    override fun intercept(chain: okhttp3.Interceptor.Chain): okhttp3.Response {
        val request = chain.request()

        // Add Authorization header if token exists
        val token = TokenManager.getAccessToken()

        val newRequest = if (token != null) {
            request.newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        } else {
            request
        }

        return chain.proceed(newRequest)
    }
}

object TokenManager {
    private var accessToken: String? = null
    private var refreshToken: String? = null

    fun saveTokens(tokens: AuthTokens) {
        accessToken = tokens.accessToken
        refreshToken = tokens.refreshToken
        // Also save to encrypted preferences
    }

    fun getAccessToken(): String? = accessToken

    fun getRefreshToken(): String? = refreshToken

    fun clearTokens() {
        accessToken = null
        refreshToken = null
    }
}
