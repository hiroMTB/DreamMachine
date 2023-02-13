# A small three.js project run on BrightSign LS424
for DreamMachine project by http://kerimseiler.com/


## Hardware
- [BrightSign LS424](https://www.brightsign.biz/digital-signage-products/LS-Product-Line/LS424)


## Firmware
- v8.5.33 (latest on 2023 Feb)
- How to check? (boot LS424 without microSD card)


## App
- Bright Author (win)
- Bright Author:connect (win & macOS)

## Debugging
- Setup Local Network publishing https://support.brightsign.biz/hc/en-us/articles/218066067-Local-File-Network-setup
- Diagnostic Web Service	your LS424 ip address
- Web Inspector 		chrome://inspect/devices#devices


## MEMO
- HTML background seems transparent or black. A simple html with text shows a black page
- “defer” does not seem wokring, `<script src="webgl-demo.js" type="module" defer></script>`




