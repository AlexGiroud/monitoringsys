### Monitoring Sys
A Client app sending OS monitoring data to an IoTHub.
Depedency mastermonitoring needed (but currently private)
You need to add a config.ini file and append the line:
```
masterUrl=
```
to your mastermonitoring app in order to register your device on IoTHub

#Installation
First you need to clone the repo
```
git clone https://github.com/AlexGiroud/monitoringsys.git
```
Then install the depedencies
```
npm install
```
Note: if you plan to monitor a macosx system, you may need to use the forked os-toolbox module instead of the original (pull request opened)
```
cd node_modules/
git clone https://github.com/AlexGiroud/os-toolbox.git
cd ..
```
Add the url of your master server to the config.ini (master server soft : https://github.com/AlexGiroud/mastermonitoring )
```
nano config.ini
```
Start the app
```
node index.js
```
