const fs = require('fs');
const path = require('path');


const source = document.getElementById('CSGOPath');


source.addEventListener('input', CheckPath);
source.addEventListener('propertychange', CheckPath);

function SubmitPath(){
    userInput = document.getElementById("CSGOPath").value;
    if(userInput != "" && userInput != null){
        if(userInput.includes("\\common\\Counter-Strike Global Offensive")){
            addedFile = AddConfigFile(userInput);
            if(addedFile){
                //Update config file
                UpdateConfigFile(userInput);
                window.location.href = path.resolve(__dirname,"..", 'MainPage/MainPage.html');
            }
        }
        else {
            alert("Invalid Path");
        }
    }
}

function UpdateConfigFile(userInput) { 
    dataToWrite = userInput;
    console.log("d>"+dataToWrite);
    fs.writeFile(path.resolve(__dirname,"..", 'StoredData/CSGO_Path.txt'), dataToWrite, err => {
    });
}

function AddConfigFile(csgoPath) {
    pathToCopyTo = `${csgoPath}\\csgo\\cfg\\gamestate_integration_statypus.cfg`;
    configPath = path.resolve(__dirname, "gamestate_integration_statypus.cfg");
    if(!fs.existsSync(`${csgoPath}\\csgo\\cfg\\gamestate_integration_statypus.cfg`)) {
        fs.copyFileSync(configPath, pathToCopyTo, fs.constants.COPYFILE_EXCL, (err) => {
            if(err){
                alert("Please close the game before continuing. Error >" + err);
                return false;
            }
            else {
                return true;
            }
        });
        return true;
    }
    else{
        return true;
    }
}

function CheckPath() {
    inputField = document.getElementById("CSGOPath");
    userInput = document.getElementById("CSGOPath").value;
    if(userInput != "" && userInput != null){
        if(userInput.includes("\\common\\Counter-Strike Global Offensive")){
            console.log("valid>" + userInput);
            inputField.classList = "w-40p mb-2 text-success";
            document.getElementById("submitBtn").disabled = false;
            document.getElementById("submitBtn").classList = "ml-1 btn-success";
        }
        else {
            console.log("invalid");
            inputField.classList = "w-40p mb-2 text-warning";
            document.getElementById("submitBtn").disabled = true;
            document.getElementById("submitBtn").classList = "ml-1 btn-warning";
        }
    }
    else {
        console.log("invalid");
        inputField.classList = "w-40p mb-2 text-warning";
        document.getElementById("submitBtn").disabled = true;
        document.getElementById("submitBtn").classList = "ml-1 btn-warning";
    }
}