http = require('http');
fs = require('fs');
const { defaultMaxListeners } = require('events');
const { stat } = require('fs');
const path = require('path');
var readTextFile = require('read-text-file');
const { SerialPort } = require('serialport');
 
serverport = 50891;
host = '127.0.0.1';

activeChallenge = "null";
activeChallengeFailed = false;
activeChallengeDuration = "null";
activeChallengeStartRound = "null";

currentData = [0,0,0];

currentRound = "null";
gameInProgress = false;

lastPacketReceived = "null";

//For serial
var statypusPort = new SerialPort({path: "COM4", baudRate: 9600, autoOpen: false,});
statypusPort.setEncoding('ascii');
statypusPort.open();
statypusPort.on('open', function() {
    console.log('Serial port open');
    statypusPort.on('data', function(data) {
        // console.log(data);
        if(data.includes("!CONFIG")){
            tempData = data.split("\r\n");
            for(var i = 0; i < tempData.length; i++){
                if(tempData[i].includes("!CONFIG")){
                    var tempStr = tempData[i].substring(tempData[i].indexOf("{"));
                    console.log("The data>"+ tempStr);
                }
            }
        }
        statypusPort.flush(err => {});
    });
});

function UpdateStatypusData(incrementJSONString) {
    statypusPort.write(`\r\n$UPDATE-DATA${incrementJSONString}`);
}

function RequestStatypusData() {
    statypusPort.write(`\r\n$GET-DATA`);
}
//end serial

SetChallengeStats();
 
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

function IsInGame(jData) {
    if(jData.hasOwnProperty("map") || jData.hasOwnProperty("player")) {
        return true;
    }
    else {
        return false;
    }
}

function GetChallenge() {
    activeChallengeFailed = false;
    let rawdata = fs.readFileSync(path.resolve(__dirname, 'challenges.json'));
    let challengesJSON = JSON.parse(rawdata);
    let challenges = challengesJSON.Challenges
    values = Object.values(challenges);
    randomChallenge = values[GetRandomNumber(0,Object.keys(challenges).length)];
    return randomChallenge;
}

function StatypusConnected() {
    return true;
}

function ConnectToStatypus() {
    //Connect to the statypus device. 1 if connected, 0 if not
    statypusConnected = true;
    if(statypusConnected) {
        var buttonEl = document.getElementById("btnSearchForStatypus");
        buttonEl.classList = "btn-success";
        var textEl = document.getElementById("statypusStatusText");
        textEl.classList = "text-success";
        textEl.innerText = "Connected";
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
    console.log("packet received");
    if(activeChallenge != "null"){
        if(data.map.phase=="gameover" && activeChallengeDuration=="end") {ChallengeComplete();}
        else if(activeChallengeDuration != "end" && activeChallengeDuration != "null"){
            //Called when the challenge is round coutned
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
                                                activeChallengeFailed = true;
                                                console.log("DEBUG: Challenge Failed");
                                                ChallengeComplete();
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

function SetChallengeStats() {
    var lblChallengeTitle = document.getElementById("lblChallengeName");
    var lblChallengeDesc = document.getElementById("lblChallengeDesc");
    var lblChallengeDuration = document.getElementById("lblChallengeDuration");
    var lblChallengeStatus = document.getElementById("lblChallengeStatus");
    if(StatypusConnected()) {
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

