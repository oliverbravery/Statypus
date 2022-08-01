"""
Statypus Raspberry Pi Pico Micropython code
By Oliver Bravery

-> serial message codes:
    ~"$GET-DATA" - returns the "saveConfig.json" file with prefix "!CONFIG" (i.e. "!CONFIG{'k': '1'}")
    ~"$GET-CONNECTED" - returns (!CONNECTED) if the device is connected
    ~"$UPDATE-DATA" - takes input of json containing keys and the value of what they wish the config
                        file to be updated with (if k:1 parsed then config k will be incremented by 1)
                        example-"$UPDATE-DATA{"k'":"2","a":"1"}"
    ~"!CHALLENGE-REQUEST" - sent from this device over serial to indicate that the hall sensor has been
                                activated.
"""

import ujson
import machine
import time
import os
from machine import Pin
import utime
import _thread

led = Pin(25, Pin.OUT)
hall_sens = Pin(28, Pin.IN)

filePath = "saveConfig.json"
templatePath = "template.json"

programOn = True

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

def UpdateJSON(ud,d):
    for k, v in ud.items():
        if isinstance(v, dict):
            UpdateJSON(v, d[k])
        else:
            d[k] = int(d[k]) + int(v)

def UpdateConfigJSON(newDetailsJSON):
    configJSON = AquireConfigJSON()
    UpdateJSON(newDetailsJSON, configJSON)
    SaveToConfigJSON(configJSON)
    
def SendChallengeRequest(pin):
    print("\r\n!CHALLENGE-REQUEST")
    print("\r\n")

hall_sens.irq(trigger=Pin.IRQ_FALLING, handler=SendChallengeRequest)

if __name__ == "__main__":
    while programOn:
        try:
            serialRec = input()
        except:
            print("")
        jsonObj = "null"
        if "$GET-DATA" in serialRec:
            configJ = AquireConfigJSON()
            print("\r\n!CONFIG" + ujson.dumps(configJ, separators=None))
            print("\r\n")
        elif "$GET-CONNECTED" in serialRec:
            print("\r\n!CONNECTED")
            print("\r\n")
        elif "$UPDATE-DATA" in serialRec:
            startIndex = serialRec.find("{")
            splitString = serialRec[startIndex:]
            jsonObj = ujson.loads(splitString)
            t1 = serialRec.find("{")
            t2 = serialRec[t1:]
            uiData = ujson.loads(t2)
            UpdateConfigJSON(uiData)
        elif "$DEBUG" in serialRec:
            print("\r\n!LED TOGGLED")
            print("\r\n")
            led.toggle()
        elif "$TURN-OFF-PROGRAM" in serialRec:
            programOn = False
            
            
                    
            



