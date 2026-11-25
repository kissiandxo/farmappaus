import XCTest

final class FarmDirectUITests: XCTestCase {
    let farm = XCUIApplication(bundleIdentifier: "au.farmdirect.app")

    func element(_ label: String, begins: Bool = false) -> XCUIElement {
        let predicate = NSPredicate(format: begins ? "label BEGINSWITH %@" : "label == %@", label)
        return farm.descendants(matching: .any).matching(predicate).firstMatch
    }

    func tap(_ label: String, scroll: Bool = false) {
        let node = element(label)
        if scroll {
            for _ in 0..<13 {
                if node.exists && node.isHittable { break }
                farm.swipeUp(velocity: .slow)
            }
        }
        XCTAssertTrue(node.waitForExistence(timeout: 35), label)
        node.tap()
    }

    func capture(_ name: String) throws {
        let image = XCUIScreen.main.screenshot()
        let attachment = XCTAttachment(screenshot: image)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
        let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        try image.pngRepresentation.write(to: documents.appendingPathComponent(name + ".png"))
    }

    func back() {
        let start = farm.coordinate(withNormalizedOffset: CGVector(dx: 0.005, dy: 0.51))
        let end = farm.coordinate(withNormalizedOffset: CGVector(dx: 0.92, dy: 0.51))
        start.press(forDuration: 0.08, thenDragTo: end)
    }

    func testWeekendFoodShopping() throws {
        continueAfterFailure = false
        farm.launch()
        XCTAssertTrue(element("Explore as a guest").waitForExistence(timeout: 75))
        try capture("09-welcome")
        tap("Explore as a guest")
        XCTAssertTrue(element("Choose your area").waitForExistence(timeout: 15))
        try capture("10-tour")
        if element("Next").exists { tap("Next") }
        if element("Try filters").exists { tap("Try filters") }
        if !element("Show 151 places").waitForExistence(timeout: 4) { tap("Filters") }
        tap("Meat: beef, lamb, pork or chicken", scroll: true)
        try capture("11-meat-filter")
        tap("Show 86 places")
        tap("Browse markets")
        tap("Market dates")
        XCTAssertTrue(element("Bream Creek Farmers Market", begins: true).waitForExistence(timeout: 20))
        try capture("16-market-dates")
        back()
        tap("Browse fruit")
        tap("Browse fruit")
        XCTAssertTrue(element("151 places").waitForExistence(timeout: 15))
        try capture("13-explore")
        tap("Browse butchers")
        XCTAssertTrue(element("45 places").waitForExistence(timeout: 15))
        try capture("14-butcher-browse")
        tap("Save Feather and Bone", scroll: true)
        let detail = element("Feather and Bone.", begins: true)
        XCTAssertTrue(detail.waitForExistence(timeout: 10))
        detail.tap()
        XCTAssertTrue(element("Saved – tap to remove").waitForExistence(timeout: 20))
        try capture("12-butcher")
        back()
        tap("Saved")
        tap("This weekend")
        XCTAssertTrue(element("1 saved place").waitForExistence(timeout: 20))
        let saved = element("Feather and Bone.", begins: true)
        XCTAssertTrue(saved.waitForExistence(timeout: 15), "VoiceOver must be able to reach the saved place")
        try capture("15-weekend")
        saved.press(forDuration: 1.0)
        tap("Cancel")
        tap("Share stops")
        let copy = element("Copy")
        XCTAssertTrue(copy.waitForExistence(timeout: 15))
        copy.tap()
        tap("Explore")
        // Tapping the active tab scrolls its list back to the category controls.
        if !element("Browse butchers").isHittable { tap("Explore") }
        tap("Browse butchers")
        tap("Save Carriageworks Farmers Market", scroll: true)
        tap("Save Bilpin Fruit Bowl", scroll: true)
        tap("Saved")
        XCTAssertTrue(element("3 saved places").waitForExistence(timeout: 20))
        try capture("18-weekend-shortlist")
    }
}
