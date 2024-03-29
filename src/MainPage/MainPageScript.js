http = require('http');
fs = require('fs');
const { defaultMaxListeners } = require('events');
const { stat } = require('fs');
const path = require('path');
var readTextFile = require('read-text-file');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { start } = require('repl');
const Store = require('electron-store');

const store = new Store();

serverport = 50891;
host = '127.0.0.1';

activeChallenge = "null";
activeChallengeFailed = false;
activeChallengeDuration = "null";
activeChallengeStartRound = "null";

currentData = [0,0,0];
currentWeaponName = null;

currentRound = "null";
gameInProgress = false;

lastPacketReceived = "null";
lastStatypusPortPacketReceived = "null";

//For serial
var statypusPort = new SerialPort({path: "COM4", baudRate: 9600, autoOpen: false,});
statypusPort.setEncoding('ascii');
const parser = statypusPort.pipe(new ReadlineParser({ delimiter: '\r\n' }))

function StartStatypusPort() {
    statypusPort.open();
    statypusPort.on('open', function() {
        console.log('Serial port open');
        ConnectToStatypus();
        statypusPort.write("$GET-DATA\r\n");
        parser.on('data', function(data) {
            console.log("Data recieved from statypus>> " + data);
            ConnectToStatypus();
            d = data;
            if(d != ""){
                if(d.includes("!CONFIG")){
                    var tempStr = d.substring(d.indexOf("{"));
                    try {
                        // fs.writeFileSync(path.resolve(__dirname,"..",   'StoredData/data.txt'), tempStr);
                        store.set("data", tempStr);
                        if(lastStatypusPortPacketReceived == "null"){
                            lastStatypusPortPacketReceived = "NOT NULL";
                            PopulateWeaponList();
                            UpdateVisableStatistics();
                        }
                        DisplayWeaponDetails();
                        UpdateVisableStatistics();
                    }
                    catch(err){console.log("error writing to file");}
                }
                else if(d.includes("!CHALLENGE-REQUEST")){
                    GetNewChallenge();
                }
            }
            statypusPort.flush(err => {});
        });
    });
}

function UpdateStatypusData(incrementJSONString) {
    statypusPort.write(`$UPDATE-DATA${incrementJSONString}\r\n`);
}
//end serial
 
function StartCSGOServer() {
    server = http.createServer( function(req, res) 
    {
        if (req.method == 'POST') 
        {
            res.writeHead(200, {'Content-Type': 'text/html'});
            var body = '';
            req.on('data', function (data) 
            {
                body += data;
            });
            req.on('end', function () 
            {
                res.end( '' );
                
                if (res.statusCode === 200) 
                {
                    console.log("CSGO Packet recieved");
                    try
                    {
                        lastPacketReceived = new Date();
                        var data = JSON.parse(body);
                        if(IsInGame(data) && data.provider.steamid == data.player.steamid) {
                            CheckChallengeCompletion(data);
                            if(!data.hasOwnProperty("map")) {gameInProgress = false; currentRound = "null";}
                            else if(data.map.phase == "gameover") {gameInProgress = false; currentRound = "null";}
                            else if(data.map.phase != "gameover") {gameInProgress = true;}
                            if(gameInProgress) {
                                currentRound = data.map.round; 
                            }
                            if(IsInGame(data)) {
                                ik = data.player.match_stats.kills;
                                ia = data.player.match_stats.assists;
                                id = data.player.match_stats.deaths;
                                var incrementVals = [0,0,0];
                                if(ik != currentData[0]) {incrementVals[0]=ik-currentData[0];}
                                if(ia != currentData[1]) {incrementVals[1]=ia-currentData[1];}
                                if(id != currentData[2]) {incrementVals[2]=id-currentData[2];}
                                currentData[0] = parseInt(ik);
                                currentData[1] = parseInt(ia);
                                currentData[2] = parseInt(id);
                                var updateString = `{"player":{"kills":"${incrementVals[0]}","assists":"${incrementVals[1]}","deaths":"${incrementVals[2]}"}}`;
                                UpdateStatypusData(updateString);
                            }
                            else {currentData = [0,0,0]; gameInProgress = false; currentRound = "null";}
                        }
                        else {
                            currentData = [0,0,0]; gameInProgress = false; currentRound = "null";
                        }
                        SetChallengeStats();
                        UpdateStatypusWeaponDetails(data);
                        // console.log("Received message: " + body);					
                    } catch (e) {}
                }				
            });
        }
        else
        {
            res.writeHead(200);
            res.end();
        }
    });
    server.listen(serverport, host);
}

function IsInGame(jData) {
    if(jData.hasOwnProperty("map") || jData.hasOwnProperty("player")) {
        return true;
    }
    else {
        return false;
    }
}

function UpdateStatypusWeaponDetails(data) {
    if(data.hasOwnProperty("previously")) {
        if(data.hasOwnProperty("player")) {
            if(data.player.hasOwnProperty("weapons")) {
                priorWeapons = data.previously.player.weapons;
                weaponsHeld = data.player.weapons;
                whObj = Object.values(weaponsHeld);
                prev = data.previously;
                for(var i = 0; i < Object.keys(whObj).length; i++) {
                    weapon = whObj[i];
                    if(prev.hasOwnProperty("player")) {
                        plr = prev.player;
                        if(plr.hasOwnProperty("weapons")) {
                            priorWeapons = Object.values(prev.player.weapons);
                            for(var j = 0; j < Object.keys(priorWeapons).length; j++) {
                                pWeap = priorWeapons[j];
                                if(Object.keys(data.player.weapons)[i] == Object.keys(prev.player.weapons)[j]) {
                                    if(pWeap.hasOwnProperty("ammo_clip")) {
                                        weaponName = weapon.name;
                                        weaponName = weaponName.replace("weapon_", "");
                                        if(pWeap.ammo_clip > weapon.ammo_clip) {
                                            tempNum = parseInt(pWeap.ammo_clip) - parseInt(weapon.ammo_clip);
                                            UpdateStatypusData(`{"weapon":{"${weaponName}":{"bullets_shot":"${tempNum}"}}}`);
                                        }
                                    }
                                    if(pWeap.hasOwnProperty("state")) {
                                        weaponName = weapon.name;
                                        weaponName = weaponName.replace("weapon_", "");
                                        UpdateStatypusData(`{"weapon":{"${weaponName}":{"times_reloaded":"1"}}}`);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

function GetChallenge() {
    activeChallengeFailed = false;
    // let rawdata = fs.readFileSync(path.resolve(__dirname,"..", 'StoredData/challenges.json'));
    let rawdata = store.get("challenges");
    let challengesJSON = JSON.parse(rawdata);
    let challenges = challengesJSON.Challenges
    values = Object.values(challenges);
    randomChallenge = values[GetRandomNumber(0,Object.keys(challenges).length)];
    return randomChallenge;
}

function ConnectToStatypus() {
    //Connect to the statypus device. returns true if connected, false if not
    if(statypusPort.isOpen || statypusPort.isOpening) {
        var buttonEl = document.getElementById("btnSearchForStatypus");
        buttonEl.classList = "btn-success";
        var textEl = document.getElementById("statypusStatusText");
        textEl.classList = "text-success";
        textEl.innerText = "Connected";
        return true;
    }
    else {
        try {
            statypusPort.open();
        }
        catch(err){}
        var buttonEl = document.getElementById("btnSearchForStatypus");
        buttonEl.classList = "btn-warning";
        var textEl = document.getElementById("statypusStatusText");
        textEl.classList = "text-warning";
        textEl.innerText = "Not Connected";
        return false;
    }
}

function ChallengeComplete() {
    SetChallengeStats();
    console.log("Chall complete");
    if(activeChallengeFailed){console.log("fail");}
    else {
        var calcPoints = parseInt(activeChallenge.points) * (parseInt(activeChallenge.roundMultiplier) * parseInt(activeChallengeDuration));
        console.log("Success");
        UpdateStatypusData(`{"player":{"points":"${calcPoints}"}}`);
    }
    activeChallenge = "null";
    activeChallengeFailed = false;
    activeChallengeDuration = "null";
    activeChallengeStartRound = "null";
}

function GetRandomNumber(Min,Max) {
    return Math.floor(Math.random() * (Max-Min)) + Min;
}

function CheckChallengeCompletion(data) {
    if(activeChallenge != "null"){
        if(data.map.phase=="gameover" && activeChallengeDuration=="end") {ChallengeComplete();}
        else if(activeChallengeDuration != "end" && activeChallengeDuration != "null"){
            //Called when the challenge is round counted
            currentRound = data.map.round;
            aimForRound = activeChallengeStartRound+activeChallengeDuration;
            if(parseInt(currentRound) == parseInt(aimForRound)) {ChallengeComplete(); }
        }
    
        if(activeChallenge.type == "weaponTypeBan" && activeChallenge != "null") {
            //banning a type of weapon
            weaponsHeld = data.player.weapons;
            whObj = Object.values(weaponsHeld);
            if(data.hasOwnProperty("previously")) {
                prev = data.previously;
                for(var i = 0; i < Object.keys(whObj).length; i++) {
                    weapon = whObj[i];
                    if(weapon.type==activeChallenge.weaponType) {
                        console.log("Banning");
                        if(prev.hasOwnProperty("player")) {
                            plr = prev.player;
                            if(plr.hasOwnProperty("weapons")) {
                                priorWeapons = Object.values(prev.player.weapons);
                                for(var j = 0; j < Object.keys(priorWeapons).length; j++) {
                                    pWeap = priorWeapons[j];
                                    if(pWeap.hasOwnProperty("ammo_clip")) {
                                        if(Object.keys(data.player.weapons)[i] == Object.keys(prev.player.weapons)[j]) {
                                            if(parseInt(pWeap.ammo_clip) > parseInt(weapon.ammo_clip)) {
                                                if(currentWeaponName == weapon.name) {
                                                    activeChallengeFailed = true;
                                                    console.log("DEBUG: Challenge Failed");
                                                    ChallengeComplete();
                                                }
                                                currentWeaponName = weapon.name;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

function GetNewChallenge() {
    if(gameInProgress){
        var currentTime = new Date();
        var tDiff = (currentTime.getTime() - lastPacketReceived.getTime()) / 1000; 
        console.log(tDiff);
        if(gameInProgress && currentRound != "null" && tDiff != "null" && (tDiff < 30)) {
            activeChallenge = GetChallenge();
            //l = 1-5; u = all game; lu = limited or unlimited
            if(activeChallenge.duration == "l") {activeChallengeDuration = GetRandomNumber(1,6);}
            else if(activeChallenge.duration == "lu") {let x = GetRandomNumber(0,2); 
                if(x == 0) {activeChallengeDuration = "end";} else{activeChallengeDuration = GetRandomNumber(1,6);}} 
            else if(activeChallenge.duration == "u") {activeChallengeDuration = "end";}
            activeChallengeStartRound = currentRound;
            console.log(activeChallenge.name);
            console.log(activeChallengeDuration);
            console.log("current round" + currentRound);
            SetChallengeStats();
        }
    }
}

function SetChallengeStats() {
    var lblChallengeTitle = document.getElementById("lblChallengeName");
    var lblChallengeDesc = document.getElementById("lblChallengeDesc");
    var lblChallengeDuration = document.getElementById("lblChallengeDuration");
    var lblChallengeStatus = document.getElementById("lblChallengeStatus");
    if(ConnectToStatypus()) {
        if(activeChallenge != "null") {
            aimForRound = activeChallengeStartRound+activeChallengeDuration;
            lblChallengeTitle.classList = "text-dark";
            lblChallengeTitle.innerText = activeChallenge.name;
            lblChallengeDesc.innerText = activeChallenge.description;
            if(activeChallengeDuration == "end") {lblChallengeDuration.innerText = "Duration: entire game";}
            else {lblChallengeDuration.innerText = `${parseInt(aimForRound) - parseInt(currentRound)} round(s) remaining`;}
            if(activeChallengeFailed){lblChallengeStatus.innerText = "challenge failed"; lblChallengeStatus.classList = "text-danger";}
            else if(!activeChallengeFailed && ((parseInt(aimForRound) != parseInt(currentRound)) || activeChallengeDuration == "end")) 
            {lblChallengeStatus.innerText = "challenge in progress"; lblChallengeStatus.classList = "text-warning";}
            else if(!activeChallengeFailed) {lblChallengeStatus.innerText = "challenge completed"; lblChallengeStatus.classList = "text-success";}
        }
        else {
            if(lblChallengeDesc.innerText == "connect the statypus device to the machine to start a challenge" || lblChallengeTitle.innerText == "no active challenge") {
                lblChallengeTitle.innerText = "no active challenge";
                lblChallengeTitle.classList = "text-warning";
                lblChallengeDesc.innerText = "active challenges will be displayed here\n you must be in a game to start a challenge";
            }
        }
    }
    else {
        lblChallengeTitle.innerText = "no active challenge";
        lblChallengeTitle.classList = "text-warning";
        lblChallengeDesc.innerText = "connect the statypus device to the machine to start a challenge";
        lblChallengeStatus.innerText = ""; 
        lblChallengeDuration.innerText = "";
        lblChallengeStatus.classList = "text-warning";
    }
}

function DisplayWeaponDetails() {
    // let storedData = readTextFile.readSync(path.resolve(__dirname,"..", 'StoredData/data.txt'));
    let storedData = store.get("data");
    let data = JSON.parse(storedData);
    selectObj = document.getElementById("weaponSelect");
    weaponID = selectObj.value;
    weaponDetailsJSON = data.weapon[weaponID];
    document.getElementById("weaponReloads").innerText = weaponDetailsJSON.times_reloaded;
    document.getElementById("weaponBulletsShot").innerText = weaponDetailsJSON.bullets_shot;
}

function PopulateWeaponList() {
    selectObj = document.getElementById("weaponSelect");
    // let storedData = readTextFile.readSync(path.resolve(__dirname,"..", 'StoredData/data.txt'));
    let storedData = store.get("data");
    let data = JSON.parse(storedData);
    let weapons = data.weapon;
    Object.keys(weapons).forEach(function(key) {
        var opt = document.createElement("option");
        opt.value = key;
        opt.innerText = weapons[key].name;
        selectObj.add(opt);
      });
    DisplayWeaponDetails();
}

function UpdateVisableStatistics(){
    // let storedData = readTextFile.readSync(path.resolve(__dirname,"..", 'StoredData/data.txt'));
    let storedData = store.get("data");
    let data = JSON.parse(storedData);
    document.getElementById("playerDeaths").innerText = data.player.deaths;
    document.getElementById("playerAssists").innerText = data.player.assists;
    document.getElementById("playerKills").innerText = data.player.kills;
    document.getElementById("playerPoints").innerText = data.player.points;
}



function startUp() {
    StartStatypusPort();
    SetChallengeStats();
    StartCSGOServer();
    PopulateWeaponList();
    UpdateVisableStatistics();
}

startUp();