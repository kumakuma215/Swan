import type { ChatInputCommand } from '@sapphire/framework';
import type { ApplicationCommandOptionData, AutocompleteInteraction, CommandInteraction } from 'discord.js';
import { MessageEmbed } from 'discord.js';
import { ApplicationCommandOptionTypes } from 'discord.js/typings/enums';
import pupa from 'pupa';
import ApplySwanOptions from '@/app/decorators/swanOptions';
import Message from '@/app/models/message';
import SwanCommand from '@/app/structures/commands/SwanCommand';
import { MessageName } from '@/app/types';
import { searchClosestMessage } from '@/app/utils';
import { joke as config } from '@/conf/commands/fun';
import messages from '@/conf/messages';
import settings from '@/conf/settings';

@ApplySwanOptions(config)
export default class JokeCommand extends SwanCommand {
  public static commandOptions: ApplicationCommandOptionData[] = [
    {
      type: ApplicationCommandOptionTypes.STRING,
      name: 'blague',
      description: 'Blague que vous souhaitez envoyer',
      required: false,
      autocomplete: true,
    },
  ];

  public override async chatInputRun(
    interaction: CommandInteraction,
    _context: ChatInputCommand.RunContext,
  ): Promise<void> {
    await this._exec(interaction, interaction.options.getString('blague'));
  }

  public override async autocompleteRun(interaction: AutocompleteInteraction): Promise<void> {
    const jokes = await Message.find({ messageType: MessageName.Joke });
    const search = searchClosestMessage(jokes, interaction.options.getString('blague'));
    await interaction.respond(
      search
        .slice(0, 20)
        .map(entry => ({
          name: entry.matchedName,
          value: entry.baseName,
        })),
    );
  }

  private async _exec(interaction: CommandInteraction, jokeName: string | null): Promise<void> {
    // TODO(interactions): Add a "rerun" button. Increment the command's usage count.
    let joke;
    if (jokeName) {
      joke = await Message.findOne({ name: jokeName, messageType: MessageName.Joke });
    } else {
      const jokeCount = await Message.countDocuments({ messageType: MessageName.Joke });
      const random = Math.floor(Math.random() * jokeCount);
      joke = await Message.findOne({ messageType: MessageName.Joke }).skip(random);
    }

    if (!joke?.content) {
      await interaction.reply(config.messages.notFound);
      return;
    }

    const embed = new MessageEmbed()
      .setDescription(joke.content)
      .setColor(settings.colors.default)
      .setFooter({ text: pupa(messages.global.executedBy, { member: interaction.member }) })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
}
