import fs from 'fs';
import { MessageEmbed } from 'discord.js';
import { db, config, client } from '../main';
import { prunePseudo, secondToDuration, formatDate, padNumber } from '../utils';

class SanctionManager {
  static getMember(message, arg) {
    return message.guild.member(message.mentions.users.first()) || message.guild.members.cache.get(arg);
  }

  static async createChannel(victim, moderator, channelName, guild) {
    let channel;
    try {
      channel = await guild.channels.create(channelName, 'text');
      channel.setParent(config.moderation.logCategory);
      channel.setTopic(`Canal privé suite au bannissement de ${victim.user.username}, par ${moderator.username}`);
      await channel.overwritePermissions({
        permissionOverwrites: [
          {
            id: config.roles.everyone,
            deny: ['VIEW_CHANNEL'],
          }, {
            id: config.roles.staff,
            deny: ['MANAGE_CHANNELS'],
            allow: ['VIEW_CHANNEL'],
          }, {
            id: moderator.id,
            allow: ['MANAGE_CHANNELS'],
          }, {
            id: victim.id,
            allow: ['VIEW_CHANNEL'],
          },
        ],
      });
    } catch (e) {
      console.error('Error while attempting to create the channel :');
      console.error(e);
    }
    return channel;
  }

  static async addToHistory(info) {
    db.sanctionsHistory.findOne({ memberId: info.member.user.id }, async (err, result) => {
      if (err) console.error(err);

      // Si le membre n'a pas d'historique, on créé un document
      if (!result) {
        const document = {
          memberId: info.member.user.id,
          sanctions: [],
          count: 0,
          currentWarnCount: 0,
        };
        // eslint-disable-next-line no-param-reassign
        result = await new Promise((resolve, reject) => {
          db.sanctionsHistory.insert(document, (err2, newDoc) => {
            if (err) reject(err2);
            else resolve(newDoc);
          });
        }).catch(console.error);
      }

      // On ajoute la sanction à l'historique
      const count = result.count + 1;
      const sanction = {
        type: info.sanction,
        mod: info.mod.id,
        date: Date.now(),
      };
      if (info.reason) sanction.reason = info.reason;
      if (info.duration) sanction.duration = info.duration;

      db.sanctionsHistory.update({ _id: result._id }, { $push: { sanctions: sanction } }, {}, (err2) => {
        if (err2) console.error(err2);
      });
      db.sanctionsHistory.update({ _id: result._id }, { $set: { count } }, {}, (err2) => {
        if (err2) console.error(err2);
      });

      // Si c'est un avertissement, on met à jour le nombre d'avertissement avant sanction
      if (info.sanction === 'warn') {
        let currentWarnCount = result ? result.currentWarnCount + 1 : 1;
        if (currentWarnCount >= config.moderation.warnLimitBeforeBan) currentWarnCount = 0;
        db.sanctionsHistory.update({ _id: result._id }, { $set: { currentWarnCount } }, {}, (err2) => {
          if (err2) console.error(err2);
        });
      }
    });
  }

  static addToSanctions(info) {
    db.sanctions.insert({
      sanction: info.sanction,
      reason: info.reason,
      member: info.member.id,
      modid: info.mod.id,
      start: Date.now(),
      duration: info.duration || 0,
      finish: info.finish,
    });
  }

  static log(infos, guild) {
    let action;
    if (infos.sanction === 'ban') action = 'Restriction du discord';
    else if (infos.sanction === 'hardban') action = 'Banissement';
    else if (infos.sanction === 'mute') action = "Mute des channels d'aide";
    else if (infos.sanction === 'kick') action = 'Expulsion';
    else if (infos.sanction === 'warn') action = 'Avertissement';
    else if (infos.sanction === 'music_restriction') action = 'Restriction des commandes de musiques';
    else if (infos.sanction === 'music_restriction_prolongation') action = 'Prolongation de la restriction des commandes de musiques';

    // Création de l'embed
    const embed = new MessageEmbed()
      .setColor(infos.color)
      .setTitle('Nouveau cas :')
      .setTimestamp()
      .addField(':bust_in_silhouette: Utilisateur', `${infos.member.toString()}\n(${infos.member.id})`, true)
      .addField(':cop: Modérateur', `${infos.mod.toString()}\n(${infos.mod.id})`, true)
      .addField(':tools: Action', `${action}`, true);

    if (infos.finish && infos.duration && infos.finish !== -1) {
      embed.addField(':stopwatch: Durée', `${secondToDuration(infos.duration)}\nExpire ${formatDate(infos.finish)}`, true);
    } else if (infos.duration) {
      embed.addField(':stopwatch: Durée', `${secondToDuration(infos.duration)}`, true);
    }

    embed.addField(':label: Raison', `${infos.reason}`, true);
    if (infos.privateChannel) embed.addField(':speech_left: Channel privé', `${infos.privateChannel.toString()}`, true);

    const logChannel = guild.channels.cache.get(config.channels.logs);
    logChannel.send(embed);
  }

  static removeSanction(info, guild) {
    db.sanctions.remove({ _id: info.id }, {}, (err) => {
      if (err) console.error(err);

      // On enlève le rôle de la victime
      const role = info.sanction === 'ban'
        ? guild.roles.cache.find(r => r.name === config.moderation.banRole)
        : guild.roles.cache.find(r => r.name === config.moderation.muteRole);

      if (info.member.roles.cache.has(role.id)) {
        try {
          info.member.roles.remove(role);
        } catch (e) {
          console.error(e);
        }
      }

      // On supprime le channel s'il y en a un
      const chan = guild.channels.cache.find(c => c.name === `${config.moderation.banChannelPrefix}${prunePseudo(info.member)}` && c.type === 'text');
      if (chan) chan.delete();

      // On envoie le message de log
      let action;
      if (info.sanction === 'ban') action = 'Unban';
      else if (info.sanction === 'mute') action = 'Unmute';
      else if (info.sanction === 'music_restriction') action = 'Suppression de la restriction des commandes de musiques';

      const logChannel = guild.channels.cache.get(config.channels.logs);
      const embed = new MessageEmbed()
        .setColor(config.colors.success)
        .setTitle(info.title)
        .setTimestamp()
        .addField(':bust_in_silhouette: Utilisateur', `${info.member.toString()}\n(${info.member.id})`, true)
        .addField(':cop: Modérateur', `${info.mod.toString()}\n(${info.mod.id})`, true)
        .addField(':tools: Action', `${action}`, true)
        .addField(':label: Raison', `${info.reason}\nID : ${info.id}`, true);
      if (info.file) embed.addField(':scroll: Historique des messages', 'Disponible ci-dessous', true);

      logChannel.send(embed);

      if (info.file) {
        logChannel.send({
          files: [{
            attachment: info.file.filePath,
            name: `${info.file.fileName}.txt`,
          }],
        });
      }
    });
  }

  static isBan(id) {
    return new Promise((resolve, reject) => {
      db.sanctions.findOne({ member: id, sanction: 'ban' }, (err, result) => {
        if (err) reject(err);
        resolve(!!result); // Cast result en boolean. Donc si il y a un résultat : true, sinon : false
      });
    });
  }

  static hardBan(member, ban) {
    // Ban
    if (ban) member.ban();

    // Suppression de la database
    db.sanctions.remove({ _id: member.id }, {}, (err) => {
      if (err) console.error(err);
    });

    // Suppression du channel perso
    const guild = client.guilds.cache.get(config.bot.guild);
    const chan = guild.channels.cache.find(c => c.name === `${config.moderation.banChannelPrefix}${prunePseudo(member)}` && c.type === 'text');
    if (chan) chan.delete();

    // Envoie d'un log
    this.log({
      sanction: 'hardban',
      color: '#000000',
      member,
      mod: client.user,
      reason: ban ? config.messages.miscellaneous.hardBanAutomatic : config.messages.miscellaneous.hardBanModerator,
    }, guild);
  }

  static async getAllMessages(chan) {
    const allMessagesMapped = await chan.messages.fetch().catch(console.error);
    const allMessages = [];
    for (const elt of allMessagesMapped) {
      const infos = elt[1];
      allMessages.push({
        id: infos.id,
        content: infos.content,
        authorName: infos.author.username,
        sentAt: infos.createdTimestamp,
        edited: !!infos.editedTimestamp,
      });
    }
    allMessages.sort((a, b) => a.sentAt - b.sentAt);

    return allMessages;
  }

  static getMessageHistoryFile(infos, messages) {
    let fileContent = `Historique des messages du salon du banni : ${infos.victim.user.username}. Modérateur en charge : ${infos.moderator.user.username}. Raison du banissement : ${infos.reason}.\n\n\nMessages :\n\n`;

    for (const message of messages) {
      const sentAt = new Date(message.sentAt);
      const sentAtFormatted = [
        padNumber(sentAt.getHours()),
        ':',
        padNumber(sentAt.getMinutes()),
        ':',
        padNumber(sentAt.getSeconds()),
        ' le ',
        padNumber(sentAt.getDate()),
        '/',
        padNumber(sentAt.getMonth() + 1),
        '/',
        sentAt.getFullYear(),
      ].join('');

      let line = `[${message.id}] (${sentAtFormatted}) ${message.authorName} : ${message.content}`;
      if (message.edited) line = `[Modifié] ${line}`;
      fileContent += `${line}\n`;
    }

    let fileName = prunePseudo(infos.victim);
    const path = `${__dirname}/../../databases/ban-logs/`;
    let i = 1;
    if (fs.existsSync(`${path}${fileName}.txt`)) {
      while (fs.existsSync(`${path}${fileName}-${i}.txt`)) {
        i++;
      }
      fileName += `-${i}`;
    }

    fs.writeFile(`${path}${fileName}.txt`, fileContent, (err) => {
      if (err) console.error(err);
    });

    return {
      filePath: `${path}${fileName}.txt`,
      fileName,
    };
  }
}

export default SanctionManager;
