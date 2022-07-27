"""
Statypus Raspberry Pi Pico Micropython code
By Oliver Bravery

-> serial message codes:
    ~"$GET-DATA" - returns the "saveConfig.json" file with prefix "!CONFIG" (i.e. "!CONFIG{'k': '1'}")
    ~"$GET-CONNECTED" - returns (!CONNECTED) if the device is connected
    ~"$UPDATE-DATA" - takes input of json containing keys and the value of what they wish the config
                        file to be updated with (if k:1 parsed then config k will be incremented by 1)
                        example-"$UPDATE-DATA{"k'":"2","a":"1"}"
"""

import ujson
import machine
import time
import os

filePath = "saveConfig.json"

def file_or_dir_exists(filename):
    try:
        os.stat(filename)
        return True
    except OSError:
        return False
        
def CreateEmptyConfigJSON():
    f = open(filePath, 'w')
    f.write("""{"k":"0","a":"0","d":"0"}""")
    f.close()
    
def SaveToConfigJSON(newConfigJSON):
    stringJSON = ujson.dumps(newConfigJSON, separators=None)
    f = open(filePath, 'w')
    f.write(str(stringJSON))
    f.close()

def AquireConfigJSON():
    if(file_or_dir_exists(filePath)):
        f = open(filePath)
        stringData = f.read()
        f.close()
        try:
            parsed = ujson.loads(stringData)
            return parsed
        except:
            CreateEmptyConfigJSON()
            return AquireConfigJSON()
    else:
        CreateEmptyConfigJSON()
        return AquireConfigJSON()

def UpdateConfigJSON(newDetailsJSON):
    configJSON = AquireConfigJSON()
    for key in configJSON:
        if key in newDetailsJSON:
            tNewVal = int(configJSON[key]) + int(newDetailsJSON[key])
            configJSON[key] = tNewVal
    SaveToConfigJSON(configJSON)
    
if __name__ == "__main__":
    while True:
        serialRec = input()
        jsonObj = "null"
        if "{" in serialRec:
            #contains a JSON object
            #extract the json object part of the string beginning where it says $json
            #save it to the jsonObj variable
            startIndex = serialRec.find("{")
            splitString = serialRec[startIndex:]
            jsonObj = ujson.loads(splitString)
        if "$GET-DATA" in serialRec:
            configJ = AquireConfigJSON()
            print("!CONFIG" + ujson.dumps(configJ, separators=None))
        elif "$GET-CONNECTED" in serialRec:
            print("!CONNECTED")
        elif "$UPDATE-DATA" in serialRec:
            t1 = serialRec.find("{")
            t2 = serialRec[t1:]
            uiData = ujson.loads(t2)
            UpdateConfigJSON(uiData)
                    
            

