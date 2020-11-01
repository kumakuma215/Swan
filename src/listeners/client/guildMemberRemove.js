import { Listener } from 'discord-akairo';
import { GuildAuditLogs } from 'discord.js';
import messages from '../../../config/messages';
import settings from '../../../config/settings';
import ModerationData from '../../structures/ModerationData';
import ModerationHelper from '../../structures/ModerationHelper';
import BanAction from '../../structures/actions/BanAction';
import KickAction from '../../structures/actions/KickAction';
import { constants } from '../../utils';

class GuildMemberRemoveListener extends Listener {
  constructor() {
    super('guildMemberRemove', {
      event: 'guildMemberRemove',
      emitter: 'client',
    });
  }

  async exec(member) {
    const isBanned = await ModerationHelper.isBanned(member.id, false);

    if (isBanned) {
      // Check if they're leaving while being banned
      const channel = member.guild.channels.resolve(settings.channels.log);
      const data = new ModerationData(member.guild.me, member.guild, this.client, channel)
        .setVictim(member)
        .setDuration(-1, false)
        .setReason(messages.moderation.reasons.leaveBan)
        .setType(constants.SANCTIONS.TYPES.HARDBAN);
      await new BanAction(data).commit();
    } else {
      // Check if they've been kicked
      const kicks = await member.guild.fetchAuditLogs({ type: GuildAuditLogs.Actions.MEMBER_KICK });
      const lastKick = kicks.entries.first();
      if (lastKick
        && lastKick.target.id === member.id
        && !lastKick.executor.bot
        && lastKick.createdTimestamp >= Date.now() - 1000) {
        const channel = member.guild.channels.resolve(settings.channels.log);
        const data = new ModerationData(member.guild.me, member.guild, this.client, channel)
          .setVictim(member)
          .setReason(lastKick.reason)
          .setType(constants.SANCTIONS.TYPES.KICK);
        await new KickAction(data).commit();
      }
    }
  }
}

export default GuildMemberRemoveListener;
