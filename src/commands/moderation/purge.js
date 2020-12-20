import { Argument, Command } from 'discord-akairo';
import { purge as config } from '../../../config/commands/moderation';
import settings from '../../../config/settings';
import { noop } from '../../utils';

class PurgeCommand extends Command {
  constructor() {
    super('purge', {
      aliases: config.settings.aliases,
      description: { ...config.description },
      args: [{
        id: 'amount',
        type: Argument.range('integer', 0, settings.moderation.purgeLimit),
        unordered: true,
        prompt: {
          start: config.messages.startPrompt,
          retry: config.messages.retryPrompt,
        },
      }, {
        id: 'member',
        type: Argument.union('member', 'user'),
        unordered: true,
      }, {
        id: 'force',
        match: 'flag',
        flag: ['--force', '-f'],
      }],
      clientPermissions: config.settings.clientPermissions,
      userPermissions: config.settings.userPermissions,
      channel: 'guild',
    });
  }

  async exec(message, args) {
    const { amount, member, force } = args;

    message.util.messages.set(message.id, message);
    await message.channel.bulkDelete(message.util.messages, true).catch(noop);

    const messages = (await message.channel.messages.fetch({ limit: amount }))
      .filter(msg => (member ? msg.author.id === member.id : true))
      .filter(msg => (force || !msg.member?.roles.cache.has(settings.roles.staff)));
    const deletedMessages = await message.channel.bulkDelete(messages, true);

    const msg = await message.util.send(config.messages.success.replace('{AMOUNT}', deletedMessages.size));
    await msg.delete({ timeout: 5000 }).catch(noop);
  }
}

export default PurgeCommand;
