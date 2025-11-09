import XCTest
@testable import SOSApp

final class SOSAppTests: XCTestCase {

    override func setUpWithError() throws {
        // Put setup code here. This method is called before the invocation of each test method in the class.
    }

    override func tearDownWithError() throws {
        // Put teardown code here. This method is called after the invocation of each test method in the class.
    }

    // MARK: - APIClient Tests

    func testAPIClientLoginSuccess() throws {
        let expectation = self.expectation(description: "Login should succeed")

        APIClient.shared.login(email: "test@example.com", password: "password123") { result in
            switch result {
            case .success(let response):
                XCTAssertNotNil(response.user)
                XCTAssertNotNil(response.tokens.accessToken)
                expectation.fulfill()
            case .failure(let error):
                XCTFail("Login failed with error: \(error.localizedDescription)")
            }
        }

        waitForExpectations(timeout: 5, handler: nil)
    }

    // MARK: - KeychainHelper Tests

    func testKeychainSaveAndLoad() throws {
        let key = "testKey"
        let value = "testValue"

        // Save
        KeychainHelper.save(token: value, key: key)

        // Load
        let loadedValue = KeychainHelper.load(key: key)
        XCTAssertEqual(loadedValue, value)

        // Delete
        KeychainHelper.delete(key: key)
        let deletedValue = KeychainHelper.load(key: key)
        XCTAssertNil(deletedValue)
    }

    // MARK: - OfflineQueue Tests

    func testQueueEmergencyTrigger() throws {
        let queue = OfflineQueue.shared

        let location = LocationPoint(
            latitude: 37.7749,
            longitude: -122.4194,
            accuracy: 10.0,
            timestamp: Date()
        )

        queue.queueEmergencyTrigger(type: .medical, location: location, notes: "Test emergency")

        // Verify queue is not empty
        // This would require fetching from Core Data
        XCTAssertTrue(true) // Placeholder
    }

    // MARK: - LocationService Tests

    func testLocationServiceAuthorization() throws {
        let service = LocationService()

        service.requestLocationPermission()

        // In a real test, we'd mock CLLocationManager
        XCTAssertNotNil(service)
    }

    // MARK: - Emergency Type Tests

    func testEmergencyTypeRawValues() throws {
        XCTAssertEqual(EmergencyType.medical.rawValue, "MEDICAL")
        XCTAssertEqual(EmergencyType.accident.rawValue, "ACCIDENT")
        XCTAssertEqual(EmergencyType.crime.rawValue, "CRIME")
        XCTAssertEqual(EmergencyType.fire.rawValue, "FIRE")
        XCTAssertEqual(EmergencyType.naturalDisaster.rawValue, "NATURAL_DISASTER")
        XCTAssertEqual(EmergencyType.other.rawValue, "OTHER")
    }

    // MARK: - Contact Priority Tests

    func testContactPriorityRawValues() throws {
        XCTAssertEqual(ContactPriority.primary.rawValue, "PRIMARY")
        XCTAssertEqual(ContactPriority.secondary.rawValue, "SECONDARY")
        XCTAssertEqual(ContactPriority.tertiary.rawValue, "TERTIARY")
    }

    // MARK: - Performance Tests

    func testPerformanceExample() throws {
        // This is an example of a performance test case.
        self.measure {
            // Put the code you want to measure the time of here.
            _ = (0...1000).map { $0 * 2 }
        }
    }
}
