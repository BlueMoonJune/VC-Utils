const discord = require("discord.js");
const {Client, Events, GatewayIntentBits, PermissionFlagsBits} = discord
const { randomInt } = require("node:crypto");
const fs = require('node:fs')
const path = require('node:path');

var vc_names = require("./vc_names.json")

var config = require('./config.json');
var { token } = require('./token.json');
var last_ping_times = {}

const devID = 289935860554792960
var dev

var created_channels = []

function print(val) {
    console.log(val)
}

function hasAdmin(member) {
    return member.roles.highest.permissions.has(PermissionFlagsBits.ManageChannels, true) || member.id == devID
}

print(config)

const client = new Client({

    intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers
    ]

})

client.once("ready", () =>{

    client.user.setActivity("vc/help", { type: 2 })
    client.guilds.fetch().then(guilds => {
        guilds.forEach(g => {
            var in_config = g.id.toString() in config
            print(`${g.name}, ${g.id} In Config: ${in_config}`)
            if (!(g.id.toString() in config)) {
                print("No config data for guild " + g.name + ", Creating default configs.")
                config[g.id] = {
                    update_channel_id:null,
                    update_role_id:null,
                    ping_cooldown:600000,
                    new_vc_channel:null
                }

                var data = JSON.stringify(config)
                fs.writeFile(__dirname+'/config.json', data, "utf8", (err) => {
                    if (err) throw err;
                })
            }
            last_ping_times[g.id] = 0
            
        })

    })

    console.log("BOT IS ONLINE");

})

client.on(Events.MessageCreate, message => { if (message.guild) {
    try {
    var guildId = message.guild.id
    var { update_channel_id, update_role_id, ping_cooldown, new_vc_channel } = config[guildId]

    var text = message.content
    print(hasAdmin(message.member))
    if (text.startsWith("vc/") && hasAdmin(message.member)) {
        print("Command Received! Command: " + text)
        if (text == "vc/help") {
            message.channel.send("`vc/help`: displays this\n`vc/set_update_channel`: sets the channel VC updates will be sent to\n`vc/set_update_role`: the role to ping for VC updates\n`vc/set_ping_cooldown`: set the cooldown on pings, in ms\n`vc/set_new_vc_channel`: set the voice channel that people will join to create new VCs")

        } else if (text == "vc/set_update_channel") {

            update_channel_id = message.channel.id
            config[guildId]["update_channel_id"] = update_channel_id
            var data = JSON.stringify(config)

            fs.writeFile(__dirname+'/config.json', data, "utf8", (err) => {
                if (err) throw err;
            })

            var response = new discord.EmbedBuilder()
                .setColor(0x00ccff)
                .setTitle(":white_check_mark: **Set the update channel!**")

            message.channel.send({ embeds: [response]})

        } else if (text.startsWith("vc/set_update_role")) {
            print("Set Update Role")
            var role_string = text.replace("vc/set_update_role ", "")
            if (role_string.startsWith("<@&") && role_string.endsWith(">")) {
                var role_id = role_string.replace("<@&","").replace(">","").valueOf()
            } else {
                var role_id = role_string.valueOf()
            }

            update_role_id = role_id
            config[guildId]["update_role_id"] = update_role_id
            var data = JSON.stringify(config)

            fs.writeFile(__dirname+'/config.json', data, "utf8", (err) => {
                if (err) throw err;
            })

            var response = new discord.EmbedBuilder()
                .setColor(0x00ccff)
                .setTitle(":white_check_mark: **Set the update role!**")

            message.channel.send({ embeds: [response]})
            
        } else if (text.startsWith("vc/set_ping_cooldown")) {
            var param = text.replace("vc/set_ping_cooldown ", "")

            ping_cooldown = param.valueOf()
            config[guildId]["ping_cooldown"] = ping_cooldown
            var data = JSON.stringify(config)

            fs.writeFile(__dirname+'/config.json', data, "utf8", (err) => {
                if (err) throw err;
            })

            var response = new discord.EmbedBuilder()
                .setColor(0x00ccff)
                .setTitle(":white_check_mark: **Set the ping cooldown!**")

            message.channel.send({ embeds: [response]})

        } else if (text == "vc/set_new_vc_channel") {
            new_vc_channel = message.channel.id
            config[guildId]["new_vc_channel"] = new_vc_channel
            var data = JSON.stringify(config)
            
            fs.writeFile(__dirname+'/config.json', data, "utf8", (err) => {
                if (err) throw err;
            })

            var response = new discord.EmbedBuilder()
                .setColor(0x00ccff)
                .setTitle(":white_check_mark: **Set the 'new VC' channel!**")

            message.channel.send({ embeds: [response]})

        }
    } else if (text.startsWith("vc/")) {
        var response = new discord.EmbedBuilder()
            .setColor(0x00ccff)
            .setTitle(":x: **You can't do that!**")
            .setDescription("You either need to be able to manage channels or be an administrator for this command")

        message.channel.send({ embeds: [response]})
    }

    } catch {
        dev.dmChannel.send("Uh Oh! An error was caught!")
        print("Uh Oh! An error was caught!")
    }

}})

client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    try {
    var { update_channel_id, update_role_id, ping_cooldown, new_vc_channel } = config[newState.guild.id]
    var guild = newState.guild

    if (update_channel_id == null) {
        console.log("No update channel defined!")
    } else if (oldState.channel == null && Date.now() - last_ping_times[guild.id] > ping_cooldown) {

        var channel
        guild.channels.fetch(update_channel_id)
            .then(c => {
                channel = c
                if (newState.channel.members.size == 1 && newState.channelId != 1038681946840105070) {
                    print(newState.channelId)
                    if (newState.channel.id == new_vc_channel){
                        var updateEmbed = new discord.EmbedBuilder()
                            .setColor(0x00ccff)
                            .setAuthor({name: `${newState.member.displayName} created a new VC!`, iconURL: newState.member.displayAvatarURL()})
                            .setDescription("React with 🔴 to receive these pings\nReact with ❌ to not recieve these pings")
                    } else {
                        var updateEmbed = new discord.EmbedBuilder()
                            .setColor(0x00ccff)
                            .setAuthor({name: `${newState.member.displayName} joined ${newState.channel.name}!`, iconURL: newState.member.displayAvatarURL()})
                            .setDescription("React with 🔴 to receive these pings\nReact with ❌ to not recieve these pings")
                    }

                    channel.send({content:`<@&${update_role_id}>`, embeds: [updateEmbed]}).then(m => {
                        m.react('🔴').then(() =>
                        m.react('❌').then(() => {
                            var col = m.createReactionCollector((reaction, _user) => {return reaction.emoji.name === '🔴' || reaction.emoji.name === '❌'})

                            col.on('collect', (reaction, user) => {
                                if (reaction.emoji.name === '🔴') {
                                    guild.members.fetch(user).then(member => {
                                        member.roles.add(update_role_id)
                                    })
                                } else if (reaction.emoji.name === '❌') {
                                    guild.members.fetch(user).then(member => {
                                        member.roles.remove(update_role_id)
                                    })
                                }
                            })
                        }))
                    })
                    last_ping_times[guild.id] = Date.now()
                }
            })
            .catch(console.error);

    }

    if (newState.channel && newState.channel.id == new_vc_channel) {
        var vc_category = newState.channel.parent.children

        names = vc_names[guild.id]
        vc_category.create({
            name: names[randomInt(names.length)],
            type: 2

        }).then(ch => {
            
            ch.permissionOverwrites.create(newState.member, {
                ManageChannels : true
            })
            newState.setChannel(ch)
            created_channels.push(ch.id)

        })

    } if (oldState.channel != null) { print(1); if (newState.channelId != oldState.channelId) { print(2); if (created_channels.includes(oldState.channel.id)) { print(3); if(oldState.channel.members.size == 0) {
        print("deleted " + oldState.channel.name)
        oldState.channel.delete()
        return
    }}}}

    if (newState.channelId == 1038681946840105070) {
        newState.disconnect("I said dont do it ;)")
    }

    } catch(err) {
        dev.dmChannel.send("Uh Oh! An error was caught!")
        console.log(err)
    }

})

client.on(Events.MessageReactionAdd, (reaction, user) => {
    print("reaction")
})

client.login(token)