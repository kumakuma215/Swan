import { Permissions, TextChannel } from 'discord.js';
import type { GuildChannel } from 'discord.js';
import settings from '../../config/settings';
import Sanction from '../models/sanction';
import Logger from '../structures/Logger';
import { SanctionCreations } from '../types';
import { noop, prunePseudo } from '../utils';
import type ModerationData from './ModerationData';

export default {
  async getOrCreateChannel(data: ModerationData): Promise<TextChannel | never> {
    const pseudo = prunePseudo(data.victim.member, data.victim.user, data.victim.id);
    const channelName = settings.moderation.banChannelPrefix + pseudo;

    const filter = (chan: GuildChannel): boolean => chan instanceof TextChannel && chan?.topic?.split(' ')[0] === data.victim.id;
    if (data.guild.channels.cache.some(chan => filter(chan)))
      return data.guild.channels.cache.find((chan): chan is TextChannel => filter(chan)) as TextChannel;

    try {
      const channel = await data.guild.channels.create(
        channelName,
        {
          type: 'text',
          topic: `${data.victim.id} - ${settings.moderation.banChannelTopic.replace('{MEMBER}', data.victim.member.displayName)}`,
          parent: settings.channels.privateChannelsCategory,
          permissionOverwrites: [{
            id: settings.roles.everyone,
            deny: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.CREATE_INSTANT_INVITE],
          }, {
            id: settings.roles.staff,
            allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.MANAGE_CHANNELS],
          }, {
            id: data.victim.id,
            allow: [Permissions.FLAGS.VIEW_CHANNEL],
          }],
        },
      );
      return channel;
    } catch (unknownError: unknown) {
      Logger.error(`Could not create the private channel for the ban of ${data.victim.member.displayName}.`);
      Logger.detail(`Member's name: "${data.victim.member.displayName}"`);
      Logger.detail(`Stripped name: "${pseudo}"`);
      Logger.detail(`Create channel permissions: ${data.guild.me.hasPermission(Permissions.FLAGS.MANAGE_CHANNELS)}`);
      Logger.error((unknownError as Error).stack);
      throw new Error('Private Channel Creation Failed');
    }
  },

  async removeChannel(data: ModerationData): Promise<null> {
    const filter = (chan: GuildChannel): boolean => chan instanceof TextChannel && chan?.topic?.split(' ')[0] === data.victim.id;
    const channel = data.guild.channels.cache.find((chan): chan is TextChannel => filter(chan)) as TextChannel;

    if (channel) {
      // TODO: Get the message history here and upload it to a file.
      await channel.delete();
    }
    return null;
  },

  async isBanned(memberId: string, includeHardban = false): Promise<boolean> {
    const banTypes = [SanctionCreations.Ban];
    if (includeHardban)
      banTypes.push(SanctionCreations.Hardban);

    const banObject = await Sanction.findOne({
      memberId,
      revoked: false,
      type: { $in: banTypes },
    }).catch(noop);
    return Boolean(banObject);
  },

  async isMuted(memberId: string): Promise<boolean> {
    const muteObject = await Sanction.findOne({
      memberId,
      revoked: false,
      type: SanctionCreations.Mute,
    }).catch(noop);
    return Boolean(muteObject);
  },
};
