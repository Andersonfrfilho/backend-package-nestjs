// @ts-check

/**
 * GitHub Pages costuma servir em /<repo>/
 * No workflow vamos setar BASE_PATH (ex.: "/backend-package-nestjs/").
 */
const base = process.env.BASE_PATH ?? "/";

/** @type {import('vitepress').UserConfig} */
export default {
  lang: "pt-BR",
  title: "backend-package-nestjs",
  description: "Documentação do monorepo de pacotes NestJS/Node.",
  base,

  themeConfig: {
    nav: [
      { text: "Início", link: "/" },
      { text: "Monorepo", link: "/monorepo/visao-geral" },
      { text: "Pacotes", link: "/packages/" },
      { text: "Publicação", link: "/publishing" },
    ],

    sidebar: {
      "/monorepo/": [
        {
          text: "Monorepo",
          items: [
            { text: "Visão geral", link: "/monorepo/visao-geral" },
            { text: "Criar novo pacote", link: "/monorepo/novo-pacote" },
            { text: "Shared e módulos internos", link: "/monorepo/shared" },
          ],
        },
      ],
      "/packages/": [
        {
          text: "Pacotes",
          items: [
            { text: "Visão geral", link: "/packages/" },
            { text: "http-client", link: "/packages/http-client" },
            { text: "auth-keycloak", link: "/packages/auth-keycloak" },
          ],
        },
      ],
    },

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/Andersonfrfilho/backend-package-nestjs",
      },
    ],

    search: {
      provider: "local",
    },
  },
};
