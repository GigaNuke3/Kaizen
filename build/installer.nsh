!macro customInstall
  DetailPrint "Installing Kai AI Companion..."
  
  ; Check if Ollama is already installed by looking for registry entry
  ReadRegStr $0 HKLM "SOFTWARE\Ollama" "InstallLocation"
  ReadRegStr $1 HKCU "SOFTWARE\Ollama" "InstallLocation"
  
  ${If} $0 == ""
  ${AndIf} $1 == ""
  ${AndIf} ${FileExists} "$INSTDIR\resources\ollama\OllamaSetup.exe"
    ; Ollama not found and its installer is bundled — install silently
    DetailPrint "Setting up Ollama (this may take a moment)..."
    ExecWait '"$INSTDIR\resources\ollama\OllamaSetup.exe" /S' $2
    ${If} $2 == 0
      DetailPrint "✅ Ollama installed successfully!"
    ${Else}
      DetailPrint "⚠️ Ollama install failed — Kai will set up on first launch"
    ${EndIf}
  ${ElseIf} $0 != ""
  ${OrIf} $1 != ""
    DetailPrint "✅ Ollama already installed — skipping"
  ${Else}
    DetailPrint "Ollama not bundled — install it from ollama.com to use Kai"
  ${EndIf}
  
  ; AI model will be pulled on first Kaizen launch (handled by main.js)
  DetailPrint "✅ Kai will finish setup on first launch..."
!macroend

!macro customUnInstall
!macroend