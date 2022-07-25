http = require('http');
fs = require('fs');
const path = require('path');
 
serverport = 50891;
host = '127.0.0.1';

activeChallenge = "null";
activeChallengeFailed = false;
activeChallengeDuration = "null";
activeChallengeStartRound = "null";

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
                    CheckChallengeCompletion(data);
                    if(!data.hasOwnProperty("map")) {gameInProgress = false; currentRound = "null";}
                    else if(data.map.phase == "gameover") {gameInProgress = false; currentRound = "null";}
                    else if(data.map.phase != "gameover") {gameInProgress = true;}
                    if(gameInProgress) {
                        currentRound = data.map.round;
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

function StoreData() {

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
    if(!activeChallengeFailed) {console.log("Success");}
    else {console.log("fail");}
    activeChallenge = "null";
    activeChallengeFailed = false;
    activeChallengeDuration = "null";
}

function GetRandomNumber(Min,Max) {
    return Math.floor(Math.random() * (Max-Min)) + Min;
}

function CheckChallengeCompletion(data) {
    console.log("packet received");
    if(activeChallenge == "null"){}

    else if(data.map.phase=='gameover' && activeChallengeDuration=="end") {ChallengeComplete();}
    else if(activeChallengeDuration != "end" && activeChallengeDuration != "null"){
        //Called when the challenge is round coutned
        currentRound = data.map.round;
        aimForRound = activeChallengeStartRound+activeChallengeDuration;
        console.log(currentRound + "<CR   NEEDED>" + aimForRound);
        if(currentRound == aimForRound) {ChallengeComplete(); }
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

