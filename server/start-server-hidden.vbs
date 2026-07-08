Set objShell = CreateObject("WScript.Shell")
objShell.CurrentDirectory = "C:\DEV\java_study_v2\server"
objShell.Run "cmd /c node server.js > C:\DEV\java_study_v2\server\server-startup.log 2>&1", 0, False
