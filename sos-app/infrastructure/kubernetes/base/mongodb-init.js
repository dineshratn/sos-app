// =============================================================================
// SOS App - MongoDB Initialization Script
// =============================================================================
// Purpose: Initialize MongoDB databases, collections, and indexes
// Databases: emergency_logs, emergency_messages, device_telemetry, audit_logs
// Collections: With appropriate indexes and validation rules
// =============================================================================

// This script runs automatically when MongoDB starts for the first time
// Place this file in /docker-entrypoint-initdb.d/ in the mongodb container

print("==================================================");
print("SOS App - MongoDB Initialization");
print("==================================================");

// =============================================================================
// 1. Emergency Logs Database
// =============================================================================

print("\n[1/4] Creating emergency_logs database...");

db = db.getSiblingDB("emergency_logs");

// Create collection with schema validation
db.createCollection("logs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["emergency_id", "user_id", "event_type", "timestamp", "created_at"],
      properties: {
        emergency_id: {
          bsonType: "string",
          description: "Emergency ID (UUID) - required"
        },
        user_id: {
          bsonType: "string",
          description: "User ID (UUID) - required"
        },
        event_type: {
          enum: ["CREATED", "ACKNOWLEDGED", "LOCATION_UPDATE", "RESOLVED", "ESCALATED", "CANCELLED", "STATUS_CHANGE"],
          description: "Event type - required"
        },
        timestamp: {
          bsonType: "date",
          description: "Event timestamp - required"
        },
        severity: {
          enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
          description: "Event severity"
        },
        data: {
          bsonType: "object",
          description: "Event-specific data"
        },
        metadata: {
          bsonType: "object",
          description: "Additional metadata"
        },
        created_at: {
          bsonType: "date",
          description: "Record creation timestamp - required"
        }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});

// Create indexes for emergency_logs.logs
db.logs.createIndex({ "emergency_id": 1, "timestamp": -1 });
db.logs.createIndex({ "user_id": 1, "timestamp": -1 });
db.logs.createIndex({ "event_type": 1, "timestamp": -1 });
db.logs.createIndex({ "timestamp": -1 });
db.logs.createIndex({ "created_at": -1 });

// TTL index - delete logs older than 90 days (compliance retention)
db.logs.createIndex({ "created_at": 1 }, { expireAfterSeconds: 7776000 });  // 90 days

print("✓ emergency_logs.logs collection created with indexes");

// =============================================================================
// 2. Emergency Messages Database
// =============================================================================

print("\n[2/4] Creating emergency_messages database...");

db = db.getSiblingDB("emergency_messages");

// Create messages collection
db.createCollection("messages", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["emergency_id", "sender_id", "message_type", "timestamp", "created_at"],
      properties: {
        emergency_id: {
          bsonType: "string",
          description: "Emergency ID (UUID) - required"
        },
        sender_id: {
          bsonType: "string",
          description: "Sender User ID (UUID) - required"
        },
        recipient_id: {
          bsonType: "string",
          description: "Recipient User ID (UUID) - optional for broadcast"
        },
        message_type: {
          enum: ["TEXT", "AUDIO", "VIDEO", "IMAGE", "LOCATION", "SYSTEM"],
          description: "Message type - required"
        },
        content: {
          bsonType: "string",
          description: "Message content or reference"
        },
        media_url: {
          bsonType: "string",
          description: "S3 URL for media files"
        },
        timestamp: {
          bsonType: "date",
          description: "Message timestamp - required"
        },
        delivered: {
          bsonType: "bool",
          description: "Delivery status"
        },
        read: {
          bsonType: "bool",
          description: "Read status"
        },
        metadata: {
          bsonType: "object",
          description: "Additional metadata"
        },
        created_at: {
          bsonType: "date",
          description: "Record creation timestamp - required"
        }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});

// Create indexes for messages
db.messages.createIndex({ "emergency_id": 1, "timestamp": -1 });
db.messages.createIndex({ "sender_id": 1, "timestamp": -1 });
db.messages.createIndex({ "recipient_id": 1, "timestamp": -1 });
db.messages.createIndex({ "message_type": 1, "timestamp": -1 });
db.messages.createIndex({ "timestamp": -1 });

// TTL index - delete messages older than 90 days
db.messages.createIndex({ "created_at": 1 }, { expireAfterSeconds: 7776000 });  // 90 days

print("✓ emergency_messages.messages collection created with indexes");

// Create media metadata collection
db.createCollection("media", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["emergency_id", "user_id", "media_type", "s3_key", "created_at"],
      properties: {
        emergency_id: {
          bsonType: "string",
          description: "Emergency ID (UUID) - required"
        },
        user_id: {
          bsonType: "string",
          description: "User ID (UUID) - required"
        },
        media_type: {
          enum: ["AUDIO", "VIDEO", "IMAGE"],
          description: "Media type - required"
        },
        s3_key: {
          bsonType: "string",
          description: "S3 object key - required"
        },
        s3_bucket: {
          bsonType: "string",
          description: "S3 bucket name"
        },
        file_size: {
          bsonType: "long",
          description: "File size in bytes"
        },
        mime_type: {
          bsonType: "string",
          description: "MIME type"
        },
        duration: {
          bsonType: "int",
          description: "Duration in seconds (for audio/video)"
        },
        transcription: {
          bsonType: "string",
          description: "Speech-to-text transcription (for audio)"
        },
        created_at: {
          bsonType: "date",
          description: "Record creation timestamp - required"
        }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});

// Create indexes for media
db.media.createIndex({ "emergency_id": 1, "created_at": -1 });
db.media.createIndex({ "user_id": 1, "created_at": -1 });
db.media.createIndex({ "media_type": 1, "created_at": -1 });
db.media.createIndex({ "s3_key": 1 }, { unique: true });

// TTL index - delete media metadata older than 90 days
db.media.createIndex({ "created_at": 1 }, { expireAfterSeconds: 7776000 });  // 90 days

print("✓ emergency_messages.media collection created with indexes");

// =============================================================================
// 3. Device Telemetry Database
// =============================================================================

print("\n[3/4] Creating device_telemetry database...");

db = db.getSiblingDB("device_telemetry");

// Create telemetry collection
db.createCollection("telemetry", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["device_id", "user_id", "timestamp", "created_at"],
      properties: {
        device_id: {
          bsonType: "string",
          description: "Device ID (UUID) - required"
        },
        user_id: {
          bsonType: "string",
          description: "User ID (UUID) - required"
        },
        timestamp: {
          bsonType: "date",
          description: "Telemetry timestamp - required"
        },
        battery_level: {
          bsonType: "int",
          minimum: 0,
          maximum: 100,
          description: "Battery level percentage"
        },
        signal_strength: {
          bsonType: "int",
          description: "Signal strength in dBm"
        },
        network_type: {
          enum: ["WIFI", "4G", "5G", "3G", "EDGE", "OFFLINE"],
          description: "Network connection type"
        },
        location_enabled: {
          bsonType: "bool",
          description: "GPS enabled status"
        },
        bluetooth_enabled: {
          bsonType: "bool",
          description: "Bluetooth enabled status"
        },
        app_version: {
          bsonType: "string",
          description: "App version"
        },
        os_version: {
          bsonType: "string",
          description: "OS version"
        },
        device_model: {
          bsonType: "string",
          description: "Device model"
        },
        metrics: {
          bsonType: "object",
          description: "Additional device metrics"
        },
        created_at: {
          bsonType: "date",
          description: "Record creation timestamp - required"
        }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});

// Create indexes for telemetry
db.telemetry.createIndex({ "device_id": 1, "timestamp": -1 });
db.telemetry.createIndex({ "user_id": 1, "timestamp": -1 });
db.telemetry.createIndex({ "timestamp": -1 });

// TTL index - delete telemetry older than 30 days
db.telemetry.createIndex({ "created_at": 1 }, { expireAfterSeconds: 2592000 });  // 30 days

print("✓ device_telemetry.telemetry collection created with indexes");

// Create device events collection
db.createCollection("events", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["device_id", "user_id", "event_type", "timestamp", "created_at"],
      properties: {
        device_id: {
          bsonType: "string",
          description: "Device ID (UUID) - required"
        },
        user_id: {
          bsonType: "string",
          description: "User ID (UUID) - required"
        },
        event_type: {
          enum: ["FALL_DETECTED", "BUTTON_PRESSED", "LOW_BATTERY", "OFFLINE", "ONLINE", "GEOFENCE_ENTER", "GEOFENCE_EXIT"],
          description: "Event type - required"
        },
        timestamp: {
          bsonType: "date",
          description: "Event timestamp - required"
        },
        data: {
          bsonType: "object",
          description: "Event-specific data"
        },
        created_at: {
          bsonType: "date",
          description: "Record creation timestamp - required"
        }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});

// Create indexes for device events
db.events.createIndex({ "device_id": 1, "timestamp": -1 });
db.events.createIndex({ "user_id": 1, "timestamp": -1 });
db.events.createIndex({ "event_type": 1, "timestamp": -1 });

// TTL index - delete events older than 90 days
db.events.createIndex({ "created_at": 1 }, { expireAfterSeconds: 7776000 });  // 90 days

print("✓ device_telemetry.events collection created with indexes");

// =============================================================================
// 4. Audit Logs Database (HIPAA Compliance)
// =============================================================================

print("\n[4/4] Creating audit_logs database...");

db = db.getSiblingDB("audit_logs");

// Create audit_trail collection (no TTL - permanent retention)
db.createCollection("audit_trail", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "action", "resource_type", "timestamp", "ip_address", "created_at"],
      properties: {
        user_id: {
          bsonType: "string",
          description: "User ID (UUID) - required"
        },
        action: {
          enum: ["CREATE", "READ", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "ACCESS_MEDICAL", "EXPORT", "SHARE"],
          description: "Action performed - required"
        },
        resource_type: {
          enum: ["USER", "EMERGENCY", "MEDICAL_PROFILE", "CONTACT", "DEVICE", "MESSAGE", "LOCATION"],
          description: "Resource type - required"
        },
        resource_id: {
          bsonType: "string",
          description: "Resource ID (UUID)"
        },
        timestamp: {
          bsonType: "date",
          description: "Action timestamp - required"
        },
        ip_address: {
          bsonType: "string",
          description: "Client IP address - required"
        },
        user_agent: {
          bsonType: "string",
          description: "Client user agent"
        },
        session_id: {
          bsonType: "string",
          description: "Session ID"
        },
        changes: {
          bsonType: "object",
          description: "Before/after changes for updates"
        },
        metadata: {
          bsonType: "object",
          description: "Additional audit metadata"
        },
        created_at: {
          bsonType: "date",
          description: "Record creation timestamp - required"
        }
      }
    }
  },
  validationLevel: "strict",  // Strict validation for audit logs
  validationAction: "error"
});

// Create indexes for audit_trail (NO TTL - permanent retention for compliance)
db.audit_trail.createIndex({ "user_id": 1, "timestamp": -1 });
db.audit_trail.createIndex({ "action": 1, "timestamp": -1 });
db.audit_trail.createIndex({ "resource_type": 1, "resource_id": 1, "timestamp": -1 });
db.audit_trail.createIndex({ "timestamp": -1 });
db.audit_trail.createIndex({ "created_at": -1 });

print("✓ audit_logs.audit_trail collection created with indexes");

// =============================================================================
// Summary and Verification
// =============================================================================

print("\n==================================================");
print("MongoDB Initialization Complete!");
print("==================================================");

print("\nDatabases created:");
print("  1. emergency_logs       - Emergency event logs");
print("  2. emergency_messages   - Communication messages and media");
print("  3. device_telemetry     - IoT device data");
print("  4. audit_logs          - HIPAA audit trail (permanent retention)");

print("\nCollections summary:");
print("  - emergency_logs.logs");
print("  - emergency_messages.messages");
print("  - emergency_messages.media");
print("  - device_telemetry.telemetry");
print("  - device_telemetry.events");
print("  - audit_logs.audit_trail");

print("\nData retention policies:");
print("  - Emergency logs: 90 days");
print("  - Messages: 90 days");
print("  - Media metadata: 90 days");
print("  - Device telemetry: 30 days");
print("  - Device events: 90 days");
print("  - Audit logs: Permanent (no TTL)");

print("\n==================================================");

// =============================================================================
// Production Notes:
// =============================================================================
//
// 1. Schema Validation:
//    - All collections have JSON Schema validation
//    - Validation level: "moderate" (allows updates without validation)
//    - Validation action: "warn" (logs violations, allows writes)
//    - Audit logs use "strict" validation with "error" action
//
// 2. TTL Indexes:
//    - Automatically delete old data based on retention policies
//    - Runs every 60 seconds
//    - Can be disabled: db.collection.dropIndex("created_at_1")
//
// 3. Indexes:
//    - Compound indexes for common query patterns
//    - Covering indexes where possible
//    - Monitor index usage: db.collection.aggregate([{$indexStats:{}}])
//
// 4. Sharding (for future scaling):
//    - Shard key recommendations:
//      - emergency_logs.logs: { emergency_id: "hashed" }
//      - emergency_messages.messages: { emergency_id: "hashed" }
//      - device_telemetry.telemetry: { device_id: "hashed" }
//      - audit_logs.audit_trail: { created_at: 1, user_id: 1 }
//
// 5. Monitoring:
//    - Collection stats: db.collection.stats()
//    - Index stats: db.collection.aggregate([{$indexStats:{}}])
//    - Slow queries: db.system.profile.find({millis:{$gt:100}})
//
// 6. Backup:
//    - mongodump: mongodump --db emergency_logs --archive=emergency_logs.archive
//    - mongorestore: mongorestore --archive=emergency_logs.archive
//
// =============================================================================
// Connection Strings (for services):
// =============================================================================
//
// Communication Service:
//   mongodb://sos_app:PASSWORD@mongodb-service:27017/emergency_messages?replicaSet=sos-app-rs&authSource=admin
//
// Emergency Service:
//   mongodb://sos_app:PASSWORD@mongodb-service:27017/emergency_logs?replicaSet=sos-app-rs&authSource=admin
//
// Device Service:
//   mongodb://sos_app:PASSWORD@mongodb-service:27017/device_telemetry?replicaSet=sos-app-rs&authSource=admin
//
// Audit Service:
//   mongodb://sos_app:PASSWORD@mongodb-service:27017/audit_logs?replicaSet=sos-app-rs&authSource=admin
//
// =============================================================================
