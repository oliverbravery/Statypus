const fs = require('fs');
const path = require('path');
const Store = require('electron-store');

const store = new Store();
const Challenges = {
    "Challenges": {
        "Challenge_1": {"name":"No Pistol", "description":"You (the player) can not use any pistols", "type":"weaponTypeBan", "weaponType":"Pistol", "duration":"l", "points":"100", "roundMultiplier":"1.2"},
        "Challenge_2": {"name":"No Machine Gun", "description":"You (the player) can not use any machine guns", "type":"weaponTypeBan", "weaponType":"Machine Gun", "duration":"lu", "points":"50", "roundMultiplier":"1"}
    }
};

function CheckIfFileExists() {
    // let data = fs.readFileSync(path.join(__dirname, "..", 'StoredData/CSGO_Path.txt'));
    let data = store.get("csgoPath");
    console.log("path>" + data);
    if(data != "" && data != null){
        CSGOPath = data.toString();
        if(CSGOPath.includes("\\common\\Counter-Strike Global Offensive")){
            try{
                if(fs.existsSync(`${CSGOPath}\\csgo\\cfg\\gamestate_integration_statypus.cfg`)) {
                    return true;
                }
            }
            catch(err){}
        }
    }
}

// store.set("data","");
// store.set("csgoPath","");
SetChallenges();
if(CheckIfFileExists() == true){
    window.location.replace(path.join(__dirname, "..", 'MainPage/MainPage.html'));
}
else {
    window.location.replace(path.join(__dirname, "..", 'SetupPage/SetupPage.html'));
}

function SetChallenges() {
    store.set("challenges", JSON.stringify(Challenges));
}