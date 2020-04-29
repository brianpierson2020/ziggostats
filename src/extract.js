'use strict';

module.exports = {
    extract: async (env) => {
        const puppeteer = require('puppeteer');
        let dataObject = {};
        const dateStarted = Date(Date.now()).toString();
    
        const browser = await puppeteer.launch({
            /*headless: false,
            args: ['--start-fullscreen']*/
            args: ['--no-sandbox', '--disable-setuid-sandbox']
            // https://github.com/puppeteer/puppeteer/issues/3698#issuecomment-487850812
        });
    
        const page = await browser.newPage();
        // await page.setViewport({width: 1920, height: 1080});
    
        await page.goto('http://' + env.routerIp + '/', { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] }),
    
        // Login
        await page.waitForSelector('input[id=Password]');
        await page.waitForSelector('input[type=button].submitBtn');
        await page.$eval('input[id=Password]', (el, value) => el.value = value, env.routerPass);
        await page.click('input[type=button].submitBtn');
    
    
        // Gather info from homepage
        await page.waitForSelector('div.boxed_content');
        await page.waitFor(() => !document.querySelector("table#loading"));
        const WirelessConnectedDevice = await page.$eval('div#WirelessConnectedDevice', el => el.textContent.split(':')[1].trim());
        const LanConnectedDevice = await page.$eval('div#LanConnectedDevice', el => el.textContent.split(':')[1].trim());
        await page.waitFor(() => !document.querySelector("#telephonySpinner"));
        const telcoStatus = await page.$eval('span#telcoStatus', el => el.textContent.trim());
        await page.waitFor(() => !document.querySelector("#internetSpinner"));
        const internetStatus = await page.$eval('span#internetStatus', el => el.textContent.trim());
        dataObject.general = {
            internet_status: internetStatus.replace('(', '').replace(')', '').toLowerCase(),
            telco_status: telcoStatus.replace('(', '').replace(')', '').toLowerCase(),
            wireless_connected_count: parseInt(WirelessConnectedDevice, 10),
            lan_connected_count: parseInt(LanConnectedDevice, 10),
        }
    
        // Gather mode used. Modem/Router
        await page.goto('http://' + env.routerIp + '/?modem_settings&mid=Modem', { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] });
        await page.waitForSelector('#EnableModem');
        await page.waitForSelector('#RouterMode');
        await page.waitForSelector('input#ApplyButton');
        const routerMode = await page.$eval('#EnableModem', el => el.checked) === true ? 'modem' : 'router'; // Modem Mode on
        dataObject.modem = {
            mode: routerMode
        }
    
        // Gather router info
        await page.goto('http://' + env.routerIp + '/?device_status&mid=Info', { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] });
        await page.waitForSelector('#StandardSpecificationCompliant');
        await page.waitForSelector('#HardwareVersion');
        await page.waitForSelector('#SoftwareVersion');
        await page.waitForSelector('#CmMACaddress');
        await page.waitForSelector('#CmMACSerial');
        await page.waitForSelector('#SystemUpTime');
        await page.waitForSelector('#NetworkAccess');
        const StandardSpecificationCompliant = await page.$eval('span#StandardSpecificationCompliant', el => el.textContent.split(':').splice(1).join(':').trim());
        const HardwareVersion = await page.$eval('span#HardwareVersion', el => el.textContent.split(':').splice(1).join(':').trim());
        const SoftwareVersion = await page.$eval('span#SoftwareVersion', el => el.textContent.split(':').splice(1).join(':').trim());
        const CmMACaddress = await page.$eval('span#CmMACaddress', el => el.textContent.split(':').splice(1).join(':').trim());
        const CmMACSerial = await page.$eval('span#CmMACSerial', el => el.textContent.split(':').splice(1).join(':').trim());
        const SystemUpTime = await page.$eval('span#SystemUpTime', el => el.textContent.split(':').splice(1).join(':').trim());
        const NetworkAccess = await page.$eval('span#NetworkAccess', el => el.textContent.split(':').splice(1).join(':').trim());
        dataObject.info = {
            compliant_standard: StandardSpecificationCompliant,
            hardware_version: HardwareVersion,
            software_version: SoftwareVersion,
            mac_address: CmMACaddress,
            mac_serial: CmMACSerial,
            uptime: SystemUpTime,
            network_access: NetworkAccess.toLowerCase()
        }
    
        // // Get connected devices
        await page.goto('http://' + env.routerIp + '/?device_connection&mid=ConnectedDevices', { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] });
        await page.waitForSelector('tr.dataRow');
        await page.waitFor(() => !document.querySelector("tr.dataRow img"));
        await page.evaluate(_ => {
            window.ConnectedDevices = [];
            $('tbody tr.dataRow').each(function(){
                const deviceName = $($(this).find('td')[0]).text()
                const macAddress = $($(this).find('td')[1]).text()
                const ipAddress = $($(this).find('td')[2]).text()
                const speedMbps = $($(this).find('td')[3]).text()
                const connection = $($(this).find('td')[4]).text()
                window.ConnectedDevices.push({
                    device_name: deviceName,
                    mac_address: macAddress,
                    ip_address: ipAddress,
                    speed_mbps: speedMbps,
                    connection: connection })
            })
        });
        await page.waitFor(() => window.ConnectedDevices.length === $('tbody tr.dataRow').length);
        const ConnectedDevices = await page.evaluate(() => window.ConnectedDevices)
        dataObject.connected_devices = ConnectedDevices
    
    
    
        await page.goto('http://' + env.routerIp + '/?wifi_wps&mid=WPS', { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] });
        await page.waitForSelector('#DisableWPSpush');
        await page.waitForSelector('#DisableWPSpin');
        const DisableWPSpush = await page.$eval('#DisableWPSpush', el => el.checked); // WPS Push button	
        const DisableWPSpin = await page.$eval('#DisableWPSpin', el => el.checked); // WPS PIN	
        dataObject.wps = {
            disable_push: DisableWPSpush,
            disable_pin: DisableWPSpin
        }
    
        // Wireless Signal
        await page.goto('http://' + env.routerIp + '/?wifi_radio&mid=WirelessSignal', { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] });
        await page.waitForSelector('#Enable24');
        await page.waitForSelector('#Enable50');
        await page.waitForSelector('#WiFi24ChannelBW');
        await page.waitForSelector('#WiFi50ChannelBW');
        await page.waitForSelector('#WirelessMode24');
        await page.waitForSelector('#WirelessMode50');
        await page.waitForSelector('#channelManual50');
        await page.waitForSelector('#channelManual');
        await page.waitForSelector('#Channel24');
        await page.waitForSelector('#Channel50');
        const Enable24 = await page.$eval('#Enable24', el => el.checked);
        const Enable50 = await page.$eval('#Enable50', el => el.checked);
        const WiFi24ChannelBW = await page.evaluate(() => $('select#WiFi24ChannelBW option:selected').text())
        const WiFi50ChannelBW = await page.evaluate(() => $('select#WiFi50ChannelBW option:selected').text())
        const WirelessMode24 = await page.evaluate(() => $('select#WirelessMode24 option:selected').text())
        const WirelessMode50 = await page.evaluate(() => $('select#WirelessMode50 option:selected').text())
        const channelManual50 = await page.$eval('#channelManual50', el => el.checked);
        const channelManual24 = await page.$eval('#channelManual', el => el.checked);
        const Channel24 = await page.evaluate(() => $('select#Channel24 option:selected').text())
        const Channel50 = await page.evaluate(() => $('select#Channel50 option:selected').text())
        dataObject.wireless_signal = {
            wireless_24ghz: {
                enabled: Enable24,
                mode: WirelessMode24,
                channel_width: WiFi24ChannelBW,
                channel_mode: (channelManual24 ? 'manual' : 'auto'),
                channel_number: parseInt(Channel24.replace('Channel ', ''), 10)
            },
            wireless_5ghz: {
                enabled: Enable50,
                mode: WirelessMode50,
                channel_width: WiFi50ChannelBW,
                channel_mode: (channelManual50 ? 'manual' : 'auto'),
                channel_number: parseInt(Channel50.replace('Channel ', ''), 10)
            }
        }
    
        // Wireless Security
        await page.goto('http://' + env.routerIp + '/?wifi_settings&mid=WirelessSecurity', { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] });
        await page.waitForSelector('#DisableWMACFilter');
        await page.waitForSelector('#AllowAllDevices');
        await page.waitForSelector('#DenyAllDevices');
        const DisableWMACFilter = await page.$eval('#DisableWMACFilter', el => el.checked);
        const AllowAllDevices = await page.$eval('#AllowAllDevices', el => el.checked);
        const DenyAllDevices = await page.$eval('#DenyAllDevices', el => el.checked);
        const wifiMacFilterStatus = (DisableWMACFilter ? 'disabled' : (AllowAllDevices ? 'allow' : (DenyAllDevices ? 'deny' : 'unknown')))
        await page.waitForSelector('#SSID');
        await page.waitForSelector('#SecurityModeGrp');
        await page.waitForSelector('#EnableSSIDBroadcastSecurity');
        const SSID = await page.evaluate(() => $('input#SSID').val())
        const wsSecurityModeGrp = await page.evaluate(() => $('select#SecurityModeGrp option:selected').text())
        const EnableSSIDBroadcastSecurity = await page.evaluate(() => $('#EnableSSIDBroadcastSecurity:checked').length === 1)
        await page.waitForSelector('#SSID50');
        await page.waitForSelector('#SecurityModeGrp50');
        await page.waitForSelector('#EnableSSIDBroadcastSecurity50');
        const SSID50 = await page.evaluate(() => $('input#SSID50').val())
        const wsSecurityModeGrp50 = await page.evaluate(() => $('select#SecurityModeGrp50 option:selected').text())
        const EnableSSIDBroadcastSecurity50 = await page.evaluate(() => $('#EnableSSIDBroadcastSecurity50:checked').length === 1)
        dataObject.wireless_security = {
            mac_filter_status: wifiMacFilterStatus,
            wireless_24ghz: {
                ssid: SSID,
                broadcast_ssid: EnableSSIDBroadcastSecurity,
                security_mode: wsSecurityModeGrp
            },
            wireless_5ghz: {
                ssid: SSID50,
                broadcast_ssid: EnableSSIDBroadcastSecurity50,
                security_mode: wsSecurityModeGrp50
            }
        }
    
        await page.goto('http://' + env.routerIp + '/?guest_settings&mid=WirelessGuest', { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] });
        await page.waitForSelector('#EnableGuest');
        await page.waitForSelector('#EnableSSIDBroadcastGuest');
        await page.waitForSelector('#NetworkSSID');
        await page.waitForSelector('#SecurityModeGrp');
        const EnableGuest = await page.$eval('#EnableGuest', el => el.checked); // Guest mode on // $('#DisableGuest:checked')
        const EnableSSIDBroadcastGuest = await page.$eval('#EnableSSIDBroadcastGuest', el => el.checked); // EnableSSIDBroadcastGuest
        const NetworkSSIDGuest = await page.$eval('input#NetworkSSID', el => el.value);
        const wgSecurityModeGrp = await page.evaluate(() => $('select#SecurityModeGrp option:selected').text())
        dataObject.wireless_guest = {
            enabled: EnableGuest,
            ssid: NetworkSSIDGuest,
            broadcast_ssid: EnableSSIDBroadcastGuest,
            security_mode: wgSecurityModeGrp
        }
    
        // Add meta
        dataObject.meta = {
            date_started: dateStarted,
            date_finished: Date(Date.now()).toString()
        }
    
        const fs = require('fs');
        await fs.writeFileSync('/data/latest.json', JSON.stringify(dataObject), 'utf8');
    
        await page.click('div.logout a', { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] });
        await page.waitForSelector('input[id=Password]');
        await page.waitForSelector('input[type=button].submitBtn');
        await browser.close();
    }
}
