import path from 'path';
import {
  AkairoClient,
  CommandHandler,
  InhibitorHandler,
  ListenerHandler,
} from 'discord-akairo';
import messages from '../config/messages';
import settings from '../config/settings';
import CommandStat from './models/commandStat';
import Logger from './structures/Logger';

class SwanClient extends AkairoClient {
  constructor() {
    super({}, {
      disableMentions: 'everyone',
      ws: {
        intents: [
          'GUILDS', // Access to channels, create some, pin messages etc etc
          'GUILD_MEMBERS', // Access to GuildMemberAdd and GuildMemberRemove events (requires enabling via the discord dev portal)
          'GUILD_BANS', // Access to GuildBanAdd and GuildBanRemove events
          'GUILD_VOICE_STATES', // Access to VoiceStateUpdate event
          'GUILD_PRESENCES', // Access to users' presence (for .userinfo)
          'GUILD_MESSAGES', // Access to Message, MessageDelete and MessageUpdate events
          'GUILD_MESSAGE_REACTIONS', // Access to MessageReactionAdd events
        ],
      },
    });

    this.logger = new Logger();

    this.logger.info('Creating Command handler');
    this.commandHandler = new CommandHandler(this, {
      directory: path.join(__dirname, 'commands/'),
      prefix: settings.bot.prefix,
      aliasReplacement: /-/g,
      automateCategories: true,
      fetchMembers: true,
      commandUtil: true,
      handleEdits: true,
      storeMessages: true,
      argumentDefaults: {
        prompt: {
          retries: 3,
          time: 60_000,
          cancelWord: messages.prompt.cancelWord,
          stopWord: messages.prompt.stopWord,
          modifyStart: (_, text) => text + messages.prompt.footer,
          modifyRetry: (_, text) => text + messages.prompt.footer,
          timeout: messages.prompt.timeout,
          ended: messages.prompt.ended,
          cancel: messages.prompt.canceled,
        },
      },
    });

    this.logger.info('Creating Inhibitor handler');
    this.inhibitorHandler = new InhibitorHandler(this, {
      directory: path.join(__dirname, 'inhibitors/'),
    });

    this.logger.info('Creating Listener handler');
    this.listenerHandler = new ListenerHandler(this, {
      directory: path.join(__dirname, 'listeners/'),
      automateCategories: true,
    });

    this.commandHandler.useInhibitorHandler(this.inhibitorHandler);
    this.commandHandler.useListenerHandler(this.listenerHandler);

    this.listenerHandler.setEmitters({
      commandHandler: this.commandHandler,
      inhibitorHandler: this.inhibitorHandler,
      listenerHandler: this.listenerHandler,
      process,
    });

    this.commandHandler.loadAll();
    this.inhibitorHandler.loadAll();
    this.listenerHandler.loadAll();

    this.loadDatabases();

    this.logger.info('Client initialization finished');
  }

  async loadDatabases() {
    const commandIds = this.commandHandler.categories
      .array()
      .flatMap(category => category.array())
      .map(cmd => cmd.id);
    const documents = [];
    for (const commandId of commandIds)
      documents.push(CommandStat.findOneAndUpdate({ commandId }, { commandId }, { upsert: true }));

    try {
      await Promise.all(documents);
    } catch (err) {
      this.logger.error('Could not load some documents:');
      this.logger.error(err.stack);
    }
  }

  async checkValidity() {
    // Check tokens
    if (!process.env.DISCORD_TOKEN)
      this.logger.error('Discord token was not set in the environment variables (DISCORD_TOKEN)');
    if (!process.env.SENTRY_TOKEN)
      this.logger.error('Sentry DSN was not set in the environment variables (SENTRY_TOKEN)');

    // Check channels IDs
    const channels = this.guild.channels.cache;
    for (const [key, value] of Object.entries(settings.channels)) {
      if (Array.isArray(value)) {
        if (value.length === 0)
          this.logger.warn(`settings.channels.${key} is not set. You may want to fill this field to avoid any error.`);
        else if (!value.every(elt => channels.has(elt)))
          this.logger.warn(`One of the id entered for settings.channels.${key} is not a valid channel.`);
      } else if (!value) {
        this.logger.warn(`settings.channels.${key} is not set. You may want to fill this field to avoid any error.`);
      } else if (!channels.has(value)) {
        this.logger.warn(`The id entered for settings.channels.${key} is not a valid channel.`);
      }
    }

    // Check roles IDs
    for (const [key, value] of Object.entries(settings.roles)) {
      if (!value)
        this.logger.warn(`settings.roles.${key} is not set. You may want to fill this field to avoid any error.`);
      else if (!this.guild.roles.cache.has(value))
        this.logger.warn(`The id entered for settings.roles.${key} is not a valid role.`);
    }

    // TODO: Also check for emojis IDs

    // Check client's server-level permissions
    const permissions = [
      'ADD_REACTIONS',
      'VIEW_CHANNEL',
      'SEND_MESSAGES',
      'MANAGE_MESSAGES',
      'ATTACH_FILES',
      'READ_MESSAGE_HISTORY',
    ];
    if (!this.guild.me.hasPermission(permissions))
      this.logger.error(`Swan is missing Guild-Level permissions. Its cumulated roles' permissions does not contain one of the following: ${permissions.join(', ')}.`);

    // Check client's channels permissions
    for (const channel of channels.array()) {
      if (channel.type !== 'text')
        continue;

      const channelPermissions = channel.permissionsFor(this.guild.me).toArray();
      if (!permissions.every(perm => channelPermissions.includes(perm)))
        this.logger.warn(`Swan is missing permission(s) ${permissions.filter(perm => !channelPermissions.includes(perm)).join(', ')} in channel "#${channel.name}".`);
    }
  }
}

export default SwanClient;
