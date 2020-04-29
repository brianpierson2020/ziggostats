# Ziggostats
A local HTTP API to scrape regular statistics from the Arris TG2492LG router also known as Ziggo Connectbox.

## Introduction
This Docker container can be used to start a local API in your network that shows statistics about your Arris TG2492LG Router. ISP Ziggo (The Netherlands) names this router The Ziggo Connectbox. Be aware that this API should be hosted in your internal network, without exposing it to the internet. The API does not require any authentication and exposes a lot of information about your local network. _It could technically expose your SSID passwords too but for the sake of security and to prevent misconfigurations, I left that part out._

This Docker container is mainly based on [JavaScript](https://en.wikipedia.org/wiki/JavaScript), [Node.js](https://nodejs.org/), [Express](https://github.com/expressjs/express), [Puppeteer](https://github.com/puppeteer/puppeteer/) and [JSON](https://en.wikipedia.org/wiki/JSON). I made it because I wanted to intergrate statistics about my local network into my [Home-Assistant](https://www.home-assistant.io/) instance and the router naturally doesn"t have an API to talk to. Using this container you can have at least some (recent) insights about your local network intergrated somewhere else.

> **Side-note:** _In home-assistant you can for example set triggers like "notify me when a new device joins my local network" or "trigger something else when a device leaves my local network", "notify when a device is connected to the wrong SSID", "notify when a device speed is below 100Mbps"_.

## Features
The script requires some resources because it spins up an entire browser (in the background) to perform actions and scrape the data. But, it works for my purpose.  I dediced that updating the statistics only every 15 minutes would be sufficient for me. That way I am not overusing my router and overusing my Docker host resources.

You can change the update frequency with the `cronTime` variable in the `docker run` command or `docker-compose.yml` file, the cronTime should be specified using the crontab notation, if you need help with that check out [crontab.guru](https://crontab.guru/). Keep in mind that the whole process takes minimal 1 minute to complete, depending on your Docker host resources, router and network load maybe even more. I would not recommend to update it more frequent than every 10 minutes.

## Example

The generated file is accesible throught the shared volume on disk and through the HTTP API when enabled. It looks like this:

```json
{
    "general": {
        "internet_status": "online",
        "telco_status": "disabled",
        "wireless_connected_count": 1,
        "lan_connected_count": 1
    },
    "modem": {
        "mode": "router"
    },
    "info": {
        "compliant_standard": "DOCSIS 3.0",
        "hardware_version": "10",
        "software_version": "9.1.1902.203",
        "mac_address": "32:D2:5A:7B:27:54",
        "mac_serial": "AAAP99999999",
        "uptime": "65 days 12h:25m:38s",
        "network_access": "allowed"
    },
    "connected_devices": [
        {
            "device_name": "home",
            "mac_address": "CD:75:CF:73:AA:D7",
            "ip_address": "192.168.178.5/24",
            "speed_mbps": "1000",
            "connection": "Ethernet"
        },
        {
            "device_name": "Unknown",
            "mac_address": "69:55:34:78:C3:71",
            "ip_address": "192.168.178.105/24",
            "speed_mbps": "65",
            "connection": "WI-FI 2.4G MySSID24"
        }
    ],
    "wps": {
        "disable_push": true,
        "disable_pin": true
    },
    "wireless_signal": {
        "wireless_24ghz": {
            "enabled": true,
            "mode": "802.11g/n mixed",
            "channel_width": "20 MHz",
            "channel_mode": "manual",
            "channel_number": 6
        },
        "wireless_5ghz": {
            "enabled": true,
            "mode": "802.11a/n/ac mixed",
            "channel_width": "20/40/80 MHz",
            "channel_mode": "manual",
            "channel_number": 104
        }
    },
    "wireless_security": {
        "mac_filter_status": "disabled",
        "wireless_24ghz": {
            "ssid": "MySSID24",
            "broadcast_ssid": true,
            "security_mode": "WPA2-PSK"
        },
        "wireless_5ghz": {
            "ssid": "MySSID5",
            "broadcast_ssid": true,
            "security_mode": "WPA2-PSK"
        }
    },
    "wireless_guest": {
        "enabled": true,
        "ssid": "MyGuestSSID",
        "broadcast_ssid": true,
        "security_mode": "WPA2-PSK"
    },
    "meta": {
        "date_started": "Wed Apr 03 2020 09:32:47 GMT+0000 (Coordinated Universal Time)",
        "date_finished": "Wed Apr 03 2020 09:33:45 GMT+0000 (Coordinated Universal Time)"
    }
}
```

## Usage
To start using it, just change the `routerIp`, `routerPass` and if needed `cronTime` and `cronTimeZone` parameters and start the container with the commands below. The first time you run it, it might take 1-3 minutes before the statistics are scraped.

Optionally you can disable the API by setting the environment variable `disableApi=TRUE`, this way the cronjob will still run but the statistics will only be accesible using the `latest.json` file on the shared volume.

> **Note:** The router currently supports one login at the time, meaning that when you are logged in to the router manually, the script won"t be able to login and fetch data as well.

It will start a local API, by default on TCP port 43015. You can access the last data on http://127.0.0.1:43015/latest.json.

    # Stop and remove the old container/image
    docker stop ziggostats
    docker rm ziggostats
    docker image rm ziggostats

    # Build the image
    docker image build -t ziggostats .

    # Run the new container
    docker run -d -v "/docker_volumes/ziggostats:/data" --cpus=0.5 --memory=128M --network=host --restart unless-stopped -e routerIp="192.168.178.1" -e routerPass="mySecretPassword" -e cronTime="*/15 * * * *" -e cronTimeZone="Europe/Amsterdam" -e apiHost="127.0.0.1" -e apiPort="43015" -e disableApi="FALSE" --name ziggostats ziggostats

    # Debug
    docker logs ziggostats

## Building
If you don"t want to use the Docker Hub image. You can build the image yourself.

    git pull
    docker stop ziggostats
    docker rm ziggostats
    docker image build -t ziggostats .

## Disclaimer
This project is mainly based on Puppeteer which means that the script basically performs actions into a simulated browser as if a user was using the interface manually. It works fine for now, but keep in mind that when the UI of this router is changed through an update this script will likely break and stop working. That should not keep you from updating your router software.
