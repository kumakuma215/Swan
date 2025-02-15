import { stripIndent } from 'common-tags';
import { Rules } from '@/app/types';
import { activeMemberRolePrecondition, basePreconditions, channelRulesPrecondition } from '@/conf/configUtils';

export const addonPack = {
  settings: {
    name: "Pack d'add-ons",
    command: 'addonPack',
    description: "Permet de connaître les versions recommandées de Skript et de ses add-ons d'une version.",
    examples: ['addonPack 1.16.4', 'addonPack 1.13'],
  },
  messages: {
    notFound: "Désolé, je n'ai pas trouvé de pack d'add-on pour cette version. Réessaie avec une autre version !",
  },
};

export const autoMessage = {
  settings: {
    name: 'Message rapide',
    command: 'auto',
    description: "Permet d'envoyer rapidement un message prédéfini.",
    examples: ['auto skript-gui', 'automsg 1.8'],
  },
  messages: {
    notFound: "Aucun message n'existe avec ce nom... Aide-toi de l'autocomplétion de la commande \\:)",
  },
};

export const errorDetails = {
  settings: {
    name: "Détails d'erreur",
    command: 'error',
    description: 'Permet de trouver des informations supplémentaires sur une erreur rencontrée avec Skript.',
    examples: ['error Invalid amount and/or placement of double quotes'],
  },
  messages: {
    notFound: "Je n'ai pas pu trouver d'information sur ton erreur. Réessaye uniquement avec le début de l'erreur !",
  },
};

export const help = {
  settings: {
    name: 'Aide',
    command: 'help',
    description: 'Affiche la liste des commandes disponibles ou des informations précises sur une commande spécifique.',
    examples: ['help', 'aide ping'],
    preconditions: [...basePreconditions, channelRulesPrecondition(Rules.NoHelpChannel)],
  },
  messages: {
    commandInfo: {
      title: ':star: Commande "{name}"',
      usage: '❯ Utilisation',
      usableBy: '❯ Utilisable par',
      aliases: '❯ Aliases',
      examples: '❯ Exemples',
    },
    commandsList: {
      title: 'Commandes de Swan ({amount})',
      description: "Faites `{helpCommand}` pour avoir plus d'informations sur une commande.",
      category: '❯ {categoryName}',
    },
    notFound: "Aucun message n'existe avec ce nom... Aide-toi de l'autocomplétion de la commande \\:)",
  },
};

export const links = {
  settings: {
    name: 'Liens',
    command: 'links',
    description: 'Affiche la liste des liens utiles concernant Skript.',
    examples: ['links'],
  },
  messages: {
    selectMenuItemDescription: 'Page {pageIndex}',
    embed: {
      summary: [
        'Documentations de Skript.',
        'Documentations des addons de Skript.',
        'Téléchargement de Skript et de ses addons.',
        'Quelques Discord importants.',
        'Autres liens importants.',
      ],
      fields: [
        {
          name: ':books: Documentation Skript de SkriptMC : https://bit.ly/2KSZ6pN',
          value: "Documentation sur Skript, réalisée et maintenue par la communauté de Skript-MC. Elle est en français et en constante amélioration. Si tu as une suggestion ou si tu vois une erreur, n'hésite pas à nous en faire part !",
        }, {
          name: ':books: Documentation Skript officielle : https://bit.ly/2VUGZ3W',
          value: 'Documentation de Skript officielle. Elle est en anglais mais plus complète. Elle contient toutes les syntaxes utilisables dans la dernière version de Skript.',
        },
        {
          name: ':books: Documentation addons de SkriptMC : https://bit.ly/2viSqq8',
          value: 'Documentation des addons, réalisée et maintenue par la communauté de Skript-MC. Elle ne contient pas encore tous les addons, mais elle est en français et en constante amélioration !',
        }, {
          name: ':books: Documentation des addons : https://bit.ly/2UTSlJ6',
          value: 'Documentation rédigée en anglais, mais contenant la quasi-totalité des addons disponibles.',
        },
        {
          name: ':inbox_tray: Téléchargement de Skript : https://bit.ly/2TMxYNm',
          value: 'Lien officiel de téléchargement des dernières versions de Skript. La dernière version de Skript ne supporte que les dernières versions de Minecraft à partir de la 1.9.',
        }, {
          name: ':inbox_tray: Téléchargement des addons : https://bit.ly/2XvahGH',
          value: 'Lien de téléchargement des dernières versions de tous les addons de Skript.',
        },
        {
          name: ':speech_left: Discord Skript-MC : https://discord.com/invite/J3NSGaE',
          value: 'Lien officiel de ce Discord.',
        }, {
          name: ':speech_left: Discord Skript Chat : https://discord.gg/V4qFVnh',
          value: "Lien du Discord \"Skript Chat\", le serveur Discord officiel de Skript. Tu peux y demander de l'aide en anglais, que ce soit sur Skript ou sur des addons.",
        },
        {
          name: ':speech_balloon: Forum Skript-MC : https://skript-mc.fr',
          value: "Forum français de Skript-MC. Tu peux y demander des scripts, de l'aide sur Skript, Java ou vos serveurs, discuter avec des membres de la communauté ou mettre en ligne tes meilleurs projets !",
        }, {
          name: ':computer: GitHub de Skript : https://bit.ly/2W0EJrU',
          value: 'GitHub officiel du projet Skript. Tu peux y consulter son développement, y signaler des problèmes ou y contribuer.',
        },
      ],
    },
  },
};

export const move = {
  settings: {
    name: 'Déplacer un message',
    description: "Permet de déplacer un message d'un salon d'aide à un autre.",
    examples: ['move #skript-2 756858183229636640'],
    preconditions: [...basePreconditions, activeMemberRolePrecondition],
    permissions: ['Membre Actif'],
  },
  messages: {
    successfullyMoved: ':twisted_rightwards_arrows: {targetName}, ton message a été déplacé vers {targetChannel} par {memberDisplayName}.',
    moveTitle: 'Message de {targetName}',
    moveInfo: stripIndent`
      {memberDisplayName} à déplacé un message de {targetName}, depuis {sourceChannel} vers {targetChannel}.
      En cas d'erreur, réagissez avec {emoji} pour supprimer ce re-post.
    `,
    question: 'Mentionnez le salon dans lequel vous souhaitez déplacer ce message.',
    emergency: "Une erreur s'est produite lors du déplacement de ton message dans les salons d'aide. Il se peut que ton message ait été totalement supprimé, alors le voici, si tu veux le reposter :)",
  },
};

export const ping = {
  settings: {
    name: 'Ping',
    command: 'ping',
    description: "Permet de connaître la latence de Swan et de l'API Discord.",
    examples: ['ping'],
    preconditions: [...basePreconditions, channelRulesPrecondition(Rules.NoHelpChannel)],
  },
  messages: {
    firstMessage: ':incoming_envelope: Calcul en cours...',
    secondMessage: `
      :hourglass: Swan : {swanPing} ms {swanIndicator}

      :globe_with_meridians: API Discord : {discordPing} ms {discordIndicator}
    `,
  },
};

export const rule = {
  settings: {
    name: 'Règles',
    command: 'rule',
    description: 'Affiche une règle prédéfinie.',
    examples: ['regle mentions', 'regle 2'],
  },
  messages: {
    notFound: "Aucune règle n'existe avec ce nom... Aide-toi de l'autocomplétion de la commande \\:)",
    noRules: "Aucune règle n'a été rentrée dans la base de données.",
    list: 'Liste des règles :\n{list}',
  },
};

export const statistics = {
  settings: {
    name: 'Statistiques',
    command: 'statistics',
    description: 'Affiche des statistiques et diverses informations sur Swan.',
    examples: ['stats'],
    preconditions: [...basePreconditions, channelRulesPrecondition(Rules.NoHelpChannel)],
  },
  messages: {
    embed: {
      title: 'Statistiques de Swan',
      description: 'Le préfixe est `{prefix}`. Faites `{prefix}aide` pour avoir la liste des commandes.',
      version: '❯ Version',
      versionContent: stripIndent`
        Version : {version}
        Commit : {commitLink}
      `,
      uptime: '❯ Temps de fonctionnement',
      memory: '❯ Mémoire',
      commands: '❯ Commandes',
      developers: '❯ Développeurs',
      developersContent: '<@188341077902753794>\n<@191495299884122112>',
      thanks: '❯ Remerciements',
      thanksContent: stripIndent`
        <@218505052015296512> : ancien développeur
        <@187971875845046272> : contributions
        <@173542833364533249> : contributions
        <@435756597168308225> : contributions
        <@294134773901688833> : contributions
      `,
      bugs: 'Support',
      bugsContent: 'Tu peux reporter les bugs ou problèmes que tu trouves, ou les suggestions que tu as sur le [GitHub](<{url}>). Tu peux aussi venir discuter avec nous sur le [Discord](<https://discord.gg/njSgX3w>) de Swan.',
    },
  },
};
