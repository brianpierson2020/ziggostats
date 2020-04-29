'use strict';

if ((process.env.routerIp || false) === false) {
    console.log('No routerIp received')
    process.kill()
} else {
    console.log('Setup to fetch from routerIp: ', process.env.routerIp)    
}

if ((process.env.routerPass || false) === false) {
    console.log('No routerPass received')
    process.kill()
}

// API
if ((process.env.disableApi || "FALSE").toString().toUpperCase() !== "TRUE") {
    const express = require('express');
    const app = express();
    app.get('/latest.json', (_req, res) => {
        res.sendFile('/data/latest.json');
    });
    app.listen((process.env.apiPort || '43015'), (process.env.apiHost || '127.0.0.1'));
    console.log('API available on http://' + (process.env.apiHost || '127.0.0.1') + ':' + (process.env.apiPort || '43015') + '/latest.json')
} else {
    console.log('API disabled')
}

// Setting up first run and cronjob
    const extract = require('/app/extract.js');
    // First Run
    let isFirstRun = false
    const fs = require('fs');
    if (!fs.existsSync('/data/latest.json')) {
        console.log('Running for the first time')
        isFirstRun = true
    }
    // Cronjob according to schedule except on first run
    const CronJob = require('cron').CronJob;
    const job = new CronJob((process.env.cronTime || "*/15 * * * *"), function() {
        extract.extract(process.env);
    }, null, isFirstRun, process.env.cronTimeZone || 'Europe/Amsterdam');
    job.start();
    console.log('Cronjob ready')
