import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://cappylab.github.io',
  base: '/discord-mcp',
  integrations: [
    starlight({
      title: 'discord-mcp',
      description: 'Production-grade Discord MCP server for AI agents',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/cappylab/discord-mcp',
        },
      ],
      sidebar: [
        { label: 'Get started', autogenerate: { directory: 'start' } },
        { label: 'Tools (192)', autogenerate: { directory: 'tools', collapsed: true } },
        { label: 'Recipes', autogenerate: { directory: 'recipes' } },
        { label: 'Operations', autogenerate: { directory: 'operations' } },
        { label: 'Architecture', autogenerate: { directory: 'architecture' } },
        { label: 'Reference', autogenerate: { directory: 'reference' } },
      ],
    }),
  ],
});
