import { ComponentTypeId } from './schema.js';

interface Node {
  type?: number;
  content?: string;
  components?: Node[];
  accessory?: Node;
  items?: unknown[];
  media?: { url?: string };
  accent_color?: number;
  style?: number;
  label?: string;
  custom_id?: string;
  url?: string;
  divider?: boolean;
  spacing?: number;
}

function renderNode(n: Node, indent: number): string[] {
  const pad = '  '.repeat(indent);
  switch (n.type) {
    case ComponentTypeId.TextDisplay:
      return [`${pad}${n.content ?? ''}`];

    case ComponentTypeId.Button: {
      const label = n.label ?? '(no label)';
      const id = n.url !== undefined ? `[link ${n.url}]` : `[id:${n.custom_id ?? '?'}]`;
      return [`${pad}[ ${label} ] ${id}`];
    }

    case ComponentTypeId.Thumbnail:
      return [`${pad}[Thumb ${n.media?.url ?? '?'}]`];

    case ComponentTypeId.Separator:
      return [`${pad}${n.divider !== false ? '─'.repeat(40) : '·'.repeat(40)}  (Separator${n.spacing === 2 ? ', large' : ''})`];

    case ComponentTypeId.MediaGallery:
      return [`${pad}MediaGallery (${(n.items ?? []).length} items)`];

    case ComponentTypeId.File:
      return [`${pad}File ${(n as { file?: { url?: string } }).file?.url ?? '?'}`];

    case ComponentTypeId.Section: {
      const lines: string[] = [`${pad}Section`];
      for (const c of n.components ?? []) lines.push(...renderNode(c, indent + 1));
      if (n.accessory !== undefined) {
        lines.push(`${pad}  → accessory:`);
        lines.push(...renderNode(n.accessory, indent + 2));
      }
      return lines;
    }

    case ComponentTypeId.ActionRow: {
      const buttons = (n.components ?? []).map((c) => renderNode(c, 0).join(' ').trim());
      return [`${pad}ActionRow: ${buttons.join('  ')}`];
    }

    case ComponentTypeId.Container: {
      const accentHex =
        n.accent_color !== undefined ? `#${n.accent_color.toString(16).padStart(6, '0').toUpperCase()}` : '';
      const lines: string[] = [`${pad}Container ${accentHex}`.trimEnd()];
      for (const c of n.components ?? []) lines.push(...renderNode(c, indent + 1));
      return lines;
    }

    case ComponentTypeId.StringSelect:
    case ComponentTypeId.UserSelect:
    case ComponentTypeId.RoleSelect:
    case ComponentTypeId.MentionableSelect:
    case ComponentTypeId.ChannelSelect:
      return [`${pad}Select (type ${n.type ?? '?'}, custom_id:${(n as { custom_id?: string }).custom_id ?? '?'})`];

    default:
      return [`${pad}<unknown type ${n.type ?? '?'}>`];
  }
}

export function renderPreview(components: readonly Node[]): string {
  const lines: string[] = [];
  for (const c of components) lines.push(...renderNode(c, 0));
  return lines.join('\n');
}
