# Video di presentazione

Due video del sito dello Studio Squeri, pronti per i social:

| File | Formato | Dove usarlo |
| --- | --- | --- |
| `export/studio-squeri-16x9.mp4` | 1920×1080, 60 fps | YouTube, LinkedIn, Facebook, sito |
| `export/studio-squeri-9x16.mp4` | 1080×1920, 60 fps | Instagram Reels, TikTok, YouTube Shorts, Storie |
| `export/thumbs/miniatura-youtube-1280x720.jpg` | 1280×720 | Miniatura personalizzata di YouTube |
| `export/thumbs/copertina-reel-1080x1920.jpg` | 1080×1920 | Copertina del Reel e del TikTok |

Durata 1:05. Audio stereo AAC a −14 LUFS, il livello che usano YouTube, Instagram e TikTok.
Nel 9:16 i testi stanno fuori dalle zone coperte dall'interfaccia di Reels e TikTok
(fascia alta, didascalia in basso, pulsanti a destra).

Tutto quello che si vede è il sito vero, registrato fotogramma per fotogramma:
le animazioni del sipario, lo scroll, il modulo, il resoconto delle novità e il menu mobile
sono quelli del codice in questo repository. La musica e gli effetti sono originali,
generati da `audio/score.py`: nessun brano o campione di terzi, nessun diritto da pagare.

## Scene

1. Il sipario del sito e il browser che si stacca dallo schermo
2. Identità visiva: Newsreader, Plus Jakarta Sans, palette, marmo
3. I nove ambiti, una scheda che si apre
4. Le novità fiscali: fonti ufficiali, resoconto scritto dall'AI, link verificati
5. Animazioni allo scroll
6. Il modulo di richiesta, dalla compilazione alla conferma
7. Privacy: consenso per caratteri e mappe, richieste cancellate dopo 24 mesi
8. Smartphone
9. Tutte le pagine del progetto
10. Biglietto da visita, studiosqueri.net, crediti

## Rigenerare i video

Servono Node 22, Python 3 con `numpy`, `ffmpeg` e Chromium di Playwright.

```bash
npm install
```

```bash
cd video && npm install && npx playwright install chromium && cd ..
```

```bash
bash video/build.sh
```

Lo script avvia il sito in locale, registra le clip (`capture/record.mjs`), fotografa le pagine
(`capture/stills.mjs`), scrive la musica e rende i due formati con `render.mjs`.
I file intermedi finiscono in `video/.cache/`, che non va nel repository.

Per lavorare su una scena senza rendere tutto:

```bash
node video/render.mjs stills --format landscape --at 12,24.5,40
```

I tempi delle scene sono in `stage/scenes.js` (oggetto `T`, a 120 BPM: una battuta dura 2 secondi).

## Testi per i post

Da adattare a chi pubblica (lo studio o 3C Servizi Digital).

### YouTube

Titolo:

> Studio Squeri, il nuovo sito · Design, animazioni e novità fiscali con l'AI

Descrizione (i capitoli si attivano da soli: ognuno dura almeno 10 secondi):

> Il nuovo sito dello studio tributario del Dott. Maurizio Squeri, a Santo Stefano d'Aveto e Chiavari.
>
> 00:00 Apertura
> 00:10 Identità visiva e nove ambiti
> 00:22 Novità fiscali in automatico, dalle fonti ufficiali
> 00:32 Animazioni e modulo di richiesta
> 00:42 Privacy e smartphone
> 00:52 Tutte le pagine e il biglietto da visita
>
> Sito: https://studiosqueri.net
> Sito realizzato da 3C Servizi Digital: https://3cservizidigital.com
> Musica originale.

### Instagram, TikTok, Shorts

> Il nuovo sito dello Studio Squeri è online.
> Nove ambiti, un'identità su misura e le novità fiscali aggiornate in automatico dalle fonti ufficiali.
> studiosqueri.net
>
> Sito realizzato da 3C Servizi Digital
>
> #webdesign #sitoweb #studiotributario #fisco #contabilità #chiavari #santostefanodaveto #liguria

### LinkedIn

> Online il nuovo sito dello studio tributario del Dott. Maurizio Squeri.
> Nove ambiti di servizio, un'identità visiva costruita su marmo, blu notte e oro, e una sezione Novità
> che legge ogni mattina i canali ufficiali (Agenzia delle Entrate, Gazzetta Ufficiale, MEF, INPS)
> e ogni tre giorni pubblica un resoconto scritto con l'AI, con i link verificati.
> Privacy curata: caratteri e mappe si caricano solo con il consenso, le richieste si cancellano dopo 24 mesi.
> studiosqueri.net
