http = require('http');
fs = require('fs');
const { defaultMaxListeners } = require('events');
const path = require('path');
var readTextFile = require('read-text-file');
 
serverport = 50891;
host = '127.0.0.1';

activeChallenge = "null";
activeChallengeFailed = false;
activeChallengeDuration = "null";
activeChallengeStartRound = "null";

currentData = [0,0,0];

currentRound = "null";
gameInProgress = false;
 
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
					var data = JSON.parse(body);
                    if(IsInGame(data) && data.provider.steamid == data.player.steamid) {
                        CheckChallengeCompletion(data);
                        if(!data.hasOwnProperty("map")) {gameInProgress = false; currentRound = "null";}
                        else if(data.map.phase == "gameover") {gameInProgress = false; currentRound = "null";}
                        else if(data.map.phase != "gameover") {gameInProgress = true;}
                        if(gameInProgress) {
                            currentRound = data.map.round; 
                        }
                        if(IsInGame(data)) {UpdateCSVData(data.player.match_stats.kills, data.player.match_stats.assists, data.player.match_stats.deaths);}
                        else {currentData = [0,0,0]; gameInProgress = false; currentRound = "null";}
                    }
                    else {
                        currentData = [0,0,0]; gameInProgress = false; currentRound = "null";
                    }
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

function UpdateCSVData(ik,ia,id) {
    //updates the kills assists and deaths by incrementing values by the amount
    console.log("k:",ik," d:",id);
    var incrementVals = [0,0,0];
    if(ik != currentData[0]) {incrementVals[0]=ik-currentData[0];}
    if(ia != currentData[1]) {incrementVals[1]=ia-currentData[1];}
    if(id != currentData[2]) {incrementVals[2]=id-currentData[2];}
    currentData[0] = parseInt(ik);
    currentData[1] = parseInt(ia);
    currentData[2] = parseInt(id);
    let content = readTextFile.readSync(path.resolve(__dirname, 'temp/data.txt'));
    var cData =  content.split(",");
    fs.writeFile(path.resolve(__dirname, 'temp/data.txt'), `${parseInt(cData[0]) + incrementVals[0]},${parseInt(cData[1])+ incrementVals[1]},${parseInt(cData[2]) + incrementVals[2]},${parseInt(cData[3])}`, function (err) {});
}

function UpdateCSVScore(doIncrement, value) {
    //update score in csv
    let content = readTextFile.readSync(path.resolve(__dirname, 'temp/data.txt'));
    var cData =  content.split(",");
    var d = cData[3];
    if(doIncrement) {d = parseInt(d) + parseInt(value);} else{d = parseInt(d) - parseInt(value);}
    fs.writeFile(path.resolve(__dirname, 'temp/data.txt'), `${parseInt(cData[0])},${parseInt(cData[1])},${parseInt(cData[2])},${parseInt(d)}`, function (err) {});
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
    console.log("Chall complete");
    if(activeChallengeFailed){console.log("fail");}
    else {
        var calcPoints = parseInt(activeChallenge.points) * (parseInt(activeChallenge.roundMultiplier) * parseInt(activeChallengeDuration));
        console.log("Success");
        UpdateCSVScore(true,calcPoints); 
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
        if(data.map.phase=='gameover' && activeChallengeDuration=="end") {ChallengeComplete();}
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
            for(var i = 0; i < Object.keys(whObj).length; i++) {
                weapon = whObj[i];
                if(weapon.type==activeChallenge.weaponType) {
                    if(weapon.ammo_clip < weapon.ammo_clip_max) {
                        activeChallengeFailed = true;
                        console.log("DEBUG: Challenge Failed");
                        ChallengeComplete();
                    }
                }
            }
        }
    }


}

function GetNewChallenge() {
    if(gameInProgress && currentRound != "null") {
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
    }
}

