const fs = require('fs');
const path = require('path');

function CheckIfFileExists() {
    let data = fs.readFileSync(path.resolve(__dirname, "..", 'StoredData/CSGO_Path.txt'));
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

if(CheckIfFileExists() == true){
    window.location.replace(path.resolve(__dirname, "..", 'MainPage/MainPage.html'));
}
else {
    window.location.replace(path.resolve(__dirname, "..", 'SetupPage/SetupPage.html'));
}
