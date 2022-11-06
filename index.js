const discord = require("discord.js");
const { randomInt } = require("node:crypto");
const {Client, Events, Collection, GatewayIntentBits, ActivityType, discordSort } = discord
const fs = require('node:fs')
const path = require('node:path');

const { names } = require("./vc_names.json")

var config = require('./config.json');
var { token, update_channel_id, update_role_id, ping_cooldown, new_vc_channel } = config
var last_ping_time = Date.now() - 6000000

function print(val) {
    console.log(val)
}

console.log(__dirname)

const client = new Client({

    intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.Guilds
    ]

})

client.once("ready", () =>{

    console.log("BOT IS ONLINE");
    client.user.setActivity("vc/help", { type: ActivityType.Watching })

})

client.on(Events.MessageCreate, message => {

    var text = message.content
    if (text.startsWith("vc/")) {
        if (text == "vc/help") {
            message.channel.send("vc/help: displays this\nvc/set_update_channel: sets the channel VC updates will be sent to\nvc/set_update_role: the role to ping for VC updates\nvc/set_ping_cooldown: set the cooldown on pings, in ms\nvc/set_new_vc_channel: set the voice channel that people will join to create new VCs")

        } else if (text == "vc/set_update_channel") {

            update_channel_id = message.channel.id
            config["update_channel_id"] = update_channel_id
            var data = JSON.stringify(config)

            fs.writeFile(__dirname+'/config.json', data, "utf8", (err) => {
                if (err) throw err;
            })

            message.channel.send("Set the update channel!")

        } else if (text.startsWith("vc/set_update_role")) {
            print("Set Update Role")
            var role_string = text.replace("vc/set_update_role ", "")
            if (role_string.startsWith("<@&") && role_string.endsWith(">")) {
                var role_id = role_string.replace("<@&","").replace(">","").valueOf()
            } else {
                var role_id = role_string.valueOf()
            }

            update_role_id = role_id
            config["update_role_id"] = update_role_id
            var data = JSON.stringify(config)

            fs.writeFile(__dirname+'/config.json', data, "utf8", (err) => {
                if (err) throw err;
            })

            message.channel.send("Set the update role!")
            
        } else if (text.startsWith("vc/set_ping_cooldown")) {
            var param = text.replace("vc/set_ping_cooldown ", "")

            ping_cooldown = param.valueOf()
            config["ping_cooldown"] = ping_cooldown
            var data = JSON.stringify(config)

            fs.writeFile(__dirname+'/config.json', data, "utf8", (err) => {
                if (err) throw err;
            })

            message.channel.send("Set the ping cooldown!")

        } else if (text == "vc/set_new_vc_channel") {
            new_vc_channel = message.channel.id
            config["new_vc_channel"] = new_vc_channel
            var data = JSON.stringify(config)
            
            fs.writeFile(__dirname+'/config.json', data, "utf8", (err) => {
                if (err) throw err;
            })

            message.channel.send("Set the 'new VC' channel!")

        }
    }

})

client.on(Events.VoiceStateUpdate, (oldState, newState) => {

    console.log(Date.now(), last_ping_time, Date.now() - last_ping_time)
    var guild = newState.guild
    if (newState.channel && newState.channel.id == new_vc_channel) {
        var vc_category = newState.channel.parent.children
        
        vc_category.create({
            name: names[randomInt(names.length)],
            type: 2

        }).then(ch => (
            
            newState.setChannel(ch)

        ))


    } else if (newState.channelId != oldState.channelId && names.includes(oldState.channel.name) && oldState.channel.members.size == 0) {
        oldState.channel.delete()
        print("deleted " + oldState.channel.name)
        return
    } else if (update_channel_id == null) {
        console.log("No update channel defined!")
    } else if (oldState.channel == null && Date.now() - last_ping_time > ping_cooldown) {

        var channel
        guild.channels.fetch(update_channel_id)
            .then(c => {
                channel = c
                if (newState.channel.members.size == 1) {
                    //channel.send(`<@&${update_role_id}> ${newState.member.displayName} joined ${newState.channel.name}!`)
                    last_ping_time = Date.now()
                }
            })
            .catch(console.error);

    }

})

client.login(token)