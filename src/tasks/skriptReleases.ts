import { Octokit } from '@octokit/rest';
import { ApplyOptions } from '@sapphire/decorators';
import { EmbedLimits } from '@sapphire/discord-utilities';
import { MessageEmbed } from 'discord.js';
import type { TaskOptions } from '@/app/structures/tasks/Task';
import Task from '@/app/structures/tasks/Task';
import type { GithubPrerelease, GithubStableRelease } from '@/app/types';
import { noop, trimText } from '@/app/utils';
import messages from '@/conf/messages';
import settings from '@/conf/settings';
import { skriptReleases as config } from '@/conf/tasks';

@ApplyOptions<TaskOptions>({ cron: '*/10 * * * *', immediate: true })
export default class SkriptReleasesTask extends Task {
  public override async run(): Promise<void> {
    // Fetch new Skript's releases from GitHub, and post to discord if there's a new one.
    const octokit = new Octokit();
    const githubReleases = await octokit.repos.listReleases({ owner: 'SkriptLang', repo: 'Skript' })
      .catch((err: Error) => {
        this.container.logger.warn("Could not fetch GitHub's endpoint (for Skript's infos). Is either the website or the bot down/offline?");
        this.container.logger.info(err.message);
      });
    if (!githubReleases || !githubReleases.data)
      return;

    const lastRelease = githubReleases.data[0];
    if (!lastRelease)
      return;
    // We updated the cache of the releases with the one we just fetched.
    this.container.client.cache.github = {
      lastPrerelease: githubReleases.data.find((release): release is GithubPrerelease => release.prerelease),
      lastStableRelease: githubReleases.data.find((release): release is GithubStableRelease => !release.prerelease),
    };

    // We can't know if we've already posted it, so we don't post anything to prevent from spamming unnecessarily.
    if (!lastRelease.published_at)
      return;

    // If the release was not posted within the time window (refresh-rate), stop.
    if ((Date.now() - new Date(lastRelease.published_at).getTime()) > config.timeDifference)
      return;

    const channel = this.container.client.channels.cache.get(settings.channels.skriptTalk);
    if (!channel?.isText())
      return;

    const embed = new MessageEmbed()
      .setColor(settings.colors.default)
      .setAuthor({ name: lastRelease.author?.login ?? 'SkriptLang', iconURL: lastRelease.author?.avatar_url })
      .setTitle(`${lastRelease.name} (${lastRelease.tag_name})`)
      .setURL(lastRelease.html_url)
      .setDescription(
        trimText(lastRelease.body || messages.miscellaneous.noDescription, EmbedLimits.MaximumDescriptionLength),
      )
      .setFooter({ text: `${config.dataProvider} (#${lastRelease.id})` })
      .setTimestamp(new Date(lastRelease.published_at));

    await channel.send({ content: config.releaseAnnouncement, embeds: [embed] }).catch(noop);
  }
}
