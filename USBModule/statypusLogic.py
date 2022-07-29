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
from machine import Pin

led = Pin(25, Pin.OUT)

filePath = "saveConfig.json"
templatePath = "template.json"

def file_or_dir_exists(filename):
    try:
        os.stat(filename)
        return True
    except OSError:
        return False
        
def CreateEmptyConfigJSON():
    ft = open(templatePath)
    stringData = ft.read()
    ft.close()
    f = open(filePath, 'w')
    f.write(str(stringData))
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
    for (kn, vn) in newDetailsJSON.items():
       for (ko, vo) in configJSON.items():
           if kn == ko:
               #same key now need to get the same value
               for (kn2, vn2) in vn.items():
                   for (ko2, vo2) in vo.items():
                       if ko2 == kn2:
                           #same key record
                           tNewVal = int(configJSON[ko][ko2]) + int(newDetailsJSON[kn][kn2])
                           configJSON[ko][ko2] = tNewVal
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
            print("\r\n!CONFIG" + ujson.dumps(configJ, separators=None))
        elif "$GET-CONNECTED" in serialRec:
            print("\r\n!CONNECTED")
        elif "$UPDATE-DATA" in serialRec:
            t1 = serialRec.find("{")
            t2 = serialRec[t1:]
            uiData = ujson.loads(t2)
            UpdateConfigJSON(uiData)
        elif "$DEBUG" in serialRec:
            print("\r\n!LED TOGGLED")
            led.toggle()
            
            
                    
            

