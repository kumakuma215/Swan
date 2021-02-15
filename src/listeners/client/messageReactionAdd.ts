import { Listener } from 'discord-akairo';
import type { MessageReaction, User } from 'discord.js';
import pupa from 'pupa';
import Poll from '@/app/models/poll';
import PollManager from '@/app/structures/PollManager';
import { QuestionType } from '@/app/types';
import type { GuildMessage } from '@/app/types';
import { noop } from '@/app/utils';
import messages from '@/conf/messages';
import settings from '@/conf/settings';

class MessageReactionAddListener extends Listener {
  constructor() {
    super('messageReactionAdd', {
      event: 'messageReactionAdd',
      emitter: 'client',
    });
  }

  public async exec(reaction: MessageReaction, user: User): Promise<void> {
    if (user.bot || reaction.message.channel.type === 'dm')
      return;

    const { emoji, users } = reaction;
    const message = reaction.message as GuildMessage;

    const member = message.guild.members.resolve(user.id);
    const { pollReactions } = settings.miscellaneous;

    if (this.client.pollMessagesIds.includes(message.id)) {
      const poll = await Poll.findOne({ messageId: message.id });

      // Whether they react with the appropriate "answer reaction" for this poll
      if ((poll.questionType === QuestionType.Yesno
          && pollReactions.yesno.includes(emoji.name))
        || (poll.questionType === QuestionType.Choice
          && pollReactions.multiple.includes(emoji.name))) {
        // Find the reaction they choosed before (undefined if they never answered).
        type PollAnswer = [reactionName: string, votersIds: string[]];

        const previousUserVote: string | undefined = Object.entries(poll.votes)
          // We find all the entries where the user id is in the votersIds array.
          .find((entry: PollAnswer): PollAnswer | null => (entry[1].includes(user.id) ? entry : null))
          // We take the reactionName if it exists.
          ?.[0];

        if (previousUserVote === emoji.name) {
          // If they already voted for this option
          const infoMessage = await message.channel.send(messages.poll.alreadyVoted);
          setTimeout(async () => {
            if (infoMessage.deletable)
              await infoMessage.delete().catch(noop);
          }, 5000);
        } else if (previousUserVote) {
          // They have already voted, but they want to change
          // TODO: Support the "poll.multiple" option
          await Poll.findByIdAndUpdate(poll._id, {
            $pull: { [`votes.${previousUserVote}`]: user.id },
            $push: { [`votes.${emoji.name}`]: user.id },
          });

          if (!poll.anonymous) {
            const userReactions = message.reactions.cache.find(r => r.emoji.name === previousUserVote)?.users;
            if (typeof userReactions?.cache.get(user.id) !== 'undefined')
              await userReactions?.remove(user);
          }
        } else {
          // If they want to vote, and have never done so
          await Poll.findByIdAndUpdate(
            poll._id,
            { $push: { [`votes.${emoji.name}`]: user.id } },
          );
        }
        if (poll.anonymous)
          await users.remove(user);
      } else if (pollReactions.specials[1] === emoji.name && user.id === poll.memberId) {
        // If the poll's creator clicked the "Stop" button
        await PollManager.end(this.client, poll._id, true);
      } else if (pollReactions.specials[0] === emoji.name) {
        // If someone clicked the "Info" button
        await users.remove(user);
        try {
          if (member) {
            const text = poll.questionType === QuestionType.Yesno
              ? messages.poll.informationsYesNo
              : messages.poll.informationsCustom;
            await member.send(text);

            const infoMessage = await message.channel.send(pupa(messages.poll.dmSent, { member }));
            setTimeout(async () => {
              if (infoMessage.deletable)
                await infoMessage.delete().catch(noop);
            }, 5000);
          }
        } catch {
          await message.reply(messages.global.dmAreClosed);
        }
      }
    }
  }
}

export default MessageReactionAddListener;
