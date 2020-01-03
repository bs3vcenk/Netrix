import Cordova
class AMSAdBase: NSObject {
    static var ads = Dictionary<Int, Any>()
    static weak var plugin: AMSPlugin!

    var id: Int!
    var adUnitID: String!

    var plugin: AMSPlugin {
        return AMSAdBase.plugin
    }

    init(id: Int, adUnitID: String) {
        super.init()

        self.id = id
        self.adUnitID = adUnitID
        AMSAdBase.ads[id] = self
    }

    deinit {
        AMSAdBase.ads.removeValue(forKey: self.id)
        self.adUnitID = nil
    }
}
