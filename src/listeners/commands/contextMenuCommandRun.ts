import { Listener } from '@sapphire/framework';
import type { CommandInteraction } from 'discord.js';
import CommandStat from '@/app/models/commandStat';
import type SwanCommand from '@/app/structures/commands/SwanCommand';

export default class ChatInputCommandRun extends Listener {
  public override async run(interaction: CommandInteraction, command: SwanCommand): Promise<void> {
    try {
      await CommandStat.findOneAndUpdate({ commandId: command.name }, { $inc: { uses: 1 } });
    } catch (unknownError: unknown) {
      this.container.logger.error("An error occurred while updating command's stats!");
      this.container.logger.info(`Command: ${command.name}`);
      this.container.logger.error((unknownError as Error).stack);
    }
  }
}
