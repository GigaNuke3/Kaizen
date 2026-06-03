!macro customInstall
  DetailPrint "Installing AI Companion..."
  SetOutPath $INSTDIR
  
  ; Include the OllamaSetup.exe which you should download and place in the build directory
  File "${BUILD_RESOURCES_DIR}\OllamaSetup.exe"
  
  ; Run the Ollama installer silently
  ExecWait '"$INSTDIR\OllamaSetup.exe" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART'
  
  DetailPrint "Preparing Kaizen AI Companion (Pulling llama3.2)..."
  
  ; Ensure ollama is callable even if PATH hasn't been reloaded yet in this session
  ExpandEnvStrings $0 "%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
  IfFileExists $0 runOllama 0
  ExpandEnvStrings $0 "%LOCALAPPDATA%\Ollama\ollama.exe"
  IfFileExists $0 runOllama 0
  ; Fallback to global PATH
  StrCpy $0 "ollama"

runOllama:
  ; Start ollama app in the background in case the installer didn't automatically start the server
  nsExec::ExecToLog '"$0" serve'
  Sleep 3000
  
  ; Pull the model needed for the companion silently
  nsExec::ExecToLog '"$0" pull llama3.2'
  
  ; Delete the bundle after
  Delete "$INSTDIR\OllamaSetup.exe"
!macroend
