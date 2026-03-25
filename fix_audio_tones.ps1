# Fix audio tones in test-chat page.tsx
$file = "e:\Projects\shar-messenger\frontend\src\app\test-chat\page.tsx"
$content = Get-Content $file -Raw

# Replace the audio implementation
$oldPattern = @'
        // Гудки для разных состояний
        if \(newState === 'calling'\) \{
          // Исходящий звонок - гудки ожидания
          const outgoingTone = new Audio\('data:audio/wav;base64,[^']+'\);
          outgoingTone\.loop = true;
          outgoingTone\.volume = 0\.3;
          outgoingTone\.play\(\)\.catch\(\(\) => \{\}\);
          \(svc as any\)\._outgoingTone = outgoingTone;
        \} else if \(newState === 'ringing'\) \{
          // Входящий звонок - рингтон
          const incomingTone = new Audio\('data:audio/wav;base64,[^']+'\);
          incomingTone\.loop = true;
          incomingTone\.volume = 0\.5;
          incomingTone\.play\(\)\.catch\(\(\) => \{\}\);
          \(svc as any\)\._incomingTone = incomingTone;
        \} else \{
          // Остановить все гудки
          const outgoing = \(svc as any\)\._outgoingTone as HTMLAudioElement \| undefined;
          const incoming = \(svc as any\)\._incomingTone as HTMLAudioElement \| undefined;
          if \(outgoing\) \{ outgoing\.pause\(\); outgoing\.currentTime = 0; \}
          if \(incoming\) \{ incoming\.pause\(\); incoming\.currentTime = 0; \}
        \}
'@

$newCode = @'
        // Гудки для разных состояний (Web Audio API)
        if (newState === 'calling') {
          // Исходящий звонок - двойной тон 440Hz + 480Hz
          try {
            const ctx = new AudioContext();
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.value = 440;
            osc2.type = 'sine';
            osc2.frequency.value = 480;
            gain.gain.value = 0.1;
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);
            osc1.start();
            osc2.start();
            (svc as any)._tone = { osc1, osc2, gain, ctx };
            console.log('[TEST-CHAT] Outgoing tone started (440Hz + 480Hz)');
          } catch (e) {
            console.warn('[TEST-CHAT] Failed to create outgoing tone:', e);
          }
        } else if (newState === 'ringing') {
          // Входящий звонок - пульсирующий тон 520Hz
          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 520;
            gain.gain.value = 0;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            // Создаем паттерн: 1 сек звук, 3 сек тишина
            const now = ctx.currentTime;
            for (let i = 0; i < 10; i++) {
              const t = now + i * 4;
              gain.gain.setValueAtTime(0, t);
              gain.gain.linearRampToValueAtTime(0.2, t + 0.1);
              gain.gain.setValueAtTime(0.2, t + 1);
              gain.gain.linearRampToValueAtTime(0, t + 1.1);
            }
            (svc as any)._tone = { osc, gain, ctx };
            console.log('[TEST-CHAT] Incoming tone started (520Hz pulse pattern)');
          } catch (e) {
            console.warn('[TEST-CHAT] Failed to create incoming tone:', e);
          }
        } else {
          // Остановить все гудки
          const t = (svc as any)._tone;
          if (t) {
            try {
              t.osc1?.stop();
              t.osc2?.stop();
              t.osc?.stop();
              t.ctx?.close();
              console.log('[TEST-CHAT] Tones stopped');
            } catch (e) {
              console.warn('[TEST-CHAT] Error stopping tone:', e);
            }
            (svc as any)._tone = null;
          }
        }
'@

$newContent = $content -replace $oldPattern, $newCode

if ($newContent -ne $content) {
    $newContent | Set-Content $file -NoNewline
    Write-Host "✓ Audio tones fixed successfully!" -ForegroundColor Green
} else {
    Write-Host "✗ Pattern not found - manual edit required" -ForegroundColor Red
}
