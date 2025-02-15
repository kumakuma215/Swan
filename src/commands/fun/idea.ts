import type { ChatInputCommand } from '@sapphire/framework';
import type { CommandInteraction } from 'discord.js';
import { MessageEmbed } from 'discord.js';
import pupa from 'pupa';
import ApplySwanOptions from '@/app/decorators/swanOptions';
import SwanCommand from '@/app/structures/commands/SwanCommand';
import { idea as config } from '@/conf/commands/fun';
import messages from '@/conf/messages';
import settings from '@/conf/settings';

@ApplySwanOptions(config)
export default class IdeaCommand extends SwanCommand {
  public override async chatInputRun(
    interaction: CommandInteraction,
    _context: ChatInputCommand.RunContext,
  ): Promise<void> {
    await this._exec(interaction);
  }

  private async _exec(interaction: CommandInteraction): Promise<void> {
    // TODO(interactions): Add a "rerun" button. Increment the command's usage count.
    const channel = this.container.client.cache.channels.idea;

    const ideas = await channel.messages.fetch().catch(console.error);
    if (!ideas) {
      await interaction.reply(config.messages.noIdeaFound);
      return;
    }

    const randomIdea = ideas.random(1)[0];
    if (!randomIdea) {
      await interaction.reply(config.messages.noIdeaFound);
      return;
    }

    const embed = new MessageEmbed()
      .setColor(settings.colors.default)
      .setAuthor({
        name: pupa(config.messages.ideaTitle, { name: randomIdea.member?.displayName ?? messages.global.unknownName }),
        iconURL: randomIdea.author.avatarURL() ?? '',
      })
      .setDescription(randomIdea.content)
      .setFooter({ text: pupa(messages.global.executedBy, { member: interaction.member }) })
      .setTimestamp(randomIdea.createdAt);

    await interaction.reply({ embeds: [embed] });
  }
}
